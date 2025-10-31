import pool from '../config/database';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface InvestmentLevel {
  level: number;
  name: string;
  minAmount: number;
  maxAmount: number;
  rate: number;
}

interface ActiveInvestment {
  id: number;
  user_id: number;
  amount: number;
  level: number;
  profit_rate: number;
  created_at: string;
  next_profit_date: string;
}

interface ProfitCalculation {
  investmentId: number;
  userId: number;
  investmentAmount: number;
  profitRate: number;
  dailyProfit: number;
  daysSinceStart: number;
  totalProfitEarned: number;
  shouldReceiveProfit: boolean;
}

interface ProfitRunResult {
  runId: number;
  totalInvestments: number;
  totalProfitDistributed: number;
  usersCredited: number;
  errors: string[];
}

// Investment levels configuration - matches UI
const INVESTMENT_LEVELS: InvestmentLevel[] = [
  { level: 1, name: 'Starter Plan', minAmount: 100, maxAmount: 1000, rate: 0.3 },
  { level: 2, name: 'Growth Plan', minAmount: 1001, maxAmount: 3000, rate: 0.4 },
  { level: 3, name: 'Professional Plan', minAmount: 3001, maxAmount: 6000, rate: 0.5 },
  { level: 4, name: 'Premium Plan', minAmount: 6001, maxAmount: 10000, rate: 0.6 },
  { level: 5, name: 'Elite Plan', minAmount: 10001, maxAmount: 999999999, rate: 0.7 },
];

class ProfitCalculationService {
  /**
   * Calculate daily profit for all active investments
   */
  async calculateDailyProfits(): Promise<ProfitCalculation[]> {
    try {
      logger.info('🔄 Starting daily profit calculation...');

      // Get all active investments
      const activeInvestments = await this.getActiveInvestments();
      logger.info(`📊 Found ${activeInvestments.length} active investments`);

      const profitCalculations: ProfitCalculation[] = [];

      for (const investment of activeInvestments) {
        const calculation = await this.calculateInvestmentProfit(investment);
        profitCalculations.push(calculation);
      }

      logger.info(`✅ Calculated profits for ${profitCalculations.length} investments`);
      return profitCalculations;

    } catch (error) {
      logger.error('❌ Error calculating daily profits:', error);
      throw new AppError('Failed to calculate daily profits', 500);
    }
  }

  /**
   * Get all active investments that should receive profit today
   */
  private async getActiveInvestments(): Promise<ActiveInvestment[]> {
    const query = `
      SELECT 
        i.id,
        i.user_id,
        i.amount,
        i.level,
        i.profit_rate,
        i.created_at,
        i.next_profit_date
      FROM investments i
      WHERE i.status = 'active'
        AND i.next_profit_date <= CURRENT_DATE
      ORDER BY i.created_at ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Calculate profit for a specific investment
   */
  private async calculateInvestmentProfit(investment: ActiveInvestment): Promise<ProfitCalculation> {
    const startDate = new Date(investment.created_at);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get the ORIGINAL investment amount (before any profits were added)
    const originalAmount = await this.getOriginalInvestmentAmount(investment.id);
    
    // Calculate daily profit based on ORIGINAL investment amount (fixed daily amount)
    // This ensures the same profit amount every day, no compounding
    const dailyProfit = (originalAmount * investment.profit_rate) / 100;

    // Get total profit already earned for this investment
    const totalProfitEarned = await this.getTotalProfitEarned(investment.id);

    // Determine if user should receive profit today
    const shouldReceiveProfit = daysSinceStart >= 0 && dailyProfit > 0;

    return {
      investmentId: investment.id,
      userId: investment.user_id,
      investmentAmount: originalAmount, // Original amount (no compounding)
      profitRate: investment.profit_rate,
      dailyProfit,
      daysSinceStart,
      totalProfitEarned,
      shouldReceiveProfit,
    };
  }

  /**
   * Get total profit already earned for an investment
   */
  private async getTotalProfitEarned(investmentId: number): Promise<number> {
    const query = `
      SELECT COALESCE(total_profit_earned, 0) AS total_profit
      FROM investments
      WHERE id = $1
    `;

    const result = await pool.query(query, [investmentId]);
    return result.rows.length ? parseFloat(result.rows[0].total_profit) : 0;
  }

  /**
   * Get the original investment amount (before any profits were added)
   */
  private async getOriginalInvestmentAmount(investmentId: number): Promise<number> {
    const query = `
      SELECT amount
      FROM investments
      WHERE id = $1
    `;

    const result = await pool.query(query, [investmentId]);
    if (result.rows.length === 0) {
      throw new AppError('Investment not found for profit calculation', 404);
    }
    return parseFloat(result.rows[0].amount);
  }

  /**
   * Distribute daily profits to all eligible users
   */
  async distributeDailyProfits(): Promise<ProfitRunResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if profit run already completed today
      const existingRun = await client.query(
        'SELECT id FROM profit_runs WHERE run_type = $1 AND run_date = CURRENT_DATE AND status = $2',
        ['daily', 'completed']
      );

      if (existingRun.rows.length > 0) {
        logger.warn('⚠️ Daily profit run already completed today');
        await client.query('ROLLBACK');
        throw new AppError('Daily profit run already completed', 409);
      }

      // Create profit run record
      const runId = await this.createProfitRun(client);

      // Calculate all profits
      const profitCalculations = await this.calculateDailyProfits();
      
      // Filter calculations that should receive profit
      const eligibleCalculations = profitCalculations.filter(calc => calc.shouldReceiveProfit);
      
      logger.info(`💰 Distributing profits to ${eligibleCalculations.length} users`);

      let totalProfitDistributed = 0;
      let usersCredited = 0;
      const errors: string[] = [];

      // Process each eligible investment
      for (const calculation of eligibleCalculations) {
        try {
          await this.distributeProfitToUser(client, calculation);
          totalProfitDistributed += calculation.dailyProfit;
          usersCredited++;
          
          logger.debug(`✅ Profit distributed to user ${calculation.userId}: $${calculation.dailyProfit.toFixed(2)}`);
        } catch (error) {
          const errorMsg = `Failed to distribute profit to user ${calculation.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error('❌ Profit distribution error:', error);
        }
      }

      // Update profit run record
      await this.completeProfitRun(client, runId, profitCalculations.length, totalProfitDistributed, usersCredited, errors);

      await client.query('COMMIT');

      logger.info(`🎉 Daily profit distribution completed:`, {
        totalInvestments: profitCalculations.length,
        usersCredited,
        totalProfitDistributed: totalProfitDistributed.toFixed(2),
        errors: errors.length
      });

      return {
        runId,
        totalInvestments: profitCalculations.length,
        totalProfitDistributed,
        usersCredited,
        errors
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Daily profit distribution failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Distribute profit to a specific user - Add profit to available balance (fixed daily amount)
   */
  private async distributeProfitToUser(client: any, calculation: ProfitCalculation): Promise<void> {
    // Lock account and read real total balance before
    const accBefore = await client.query(
      'SELECT id, balance, available_balance FROM accounts WHERE user_id = $1 FOR UPDATE',
      [calculation.userId]
    );
    const accountId = accBefore.rows[0]?.id;
    const balanceBefore = parseFloat(accBefore.rows[0]?.balance || 0);

    // Add profit to available balance (trigger will recompute total balance)
    await client.query(
      `UPDATE accounts 
       SET available_balance = available_balance + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [calculation.dailyProfit, calculation.userId]
    );

    // Create ledger entry with correct before/after via helper
    await client.query(
      `SELECT create_ledger_entry($1, $2, $3, $4, $5, $6)`,
      [
        calculation.userId,
        'profit',
        calculation.dailyProfit,
        'investment',
        calculation.investmentId,
        `Daily profit - Level ${calculation.profitRate}% - Day ${calculation.daysSinceStart + 1} - Fixed amount: $${calculation.dailyProfit.toFixed(2)}`
      ]
    );

    // Update investment's next profit date and cumulative profit
    await client.query(
      `UPDATE investments 
       SET next_profit_date = CURRENT_DATE + INTERVAL '1 day',
           last_profit_date = CURRENT_TIMESTAMP,
           total_profit_earned = COALESCE(total_profit_earned, 0) + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [calculation.investmentId, calculation.dailyProfit]
    );
  }

  /**
   * Create a new profit run record
   */
  private async createProfitRun(client: any): Promise<number> {
    const idempotencyKey = `daily_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    
    const result = await client.query(
      `INSERT INTO profit_runs (
        run_type, run_date, started_at, idempotency_key, status
      ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['daily', new Date().toISOString().split('T')[0], new Date(), idempotencyKey, 'running']
    );

    return result.rows[0].id;
  }

  /**
   * Complete profit run record
   */
  private async completeProfitRun(
    client: any, 
    runId: number, 
    totalInvestments: number, 
    totalProfitDistributed: number, 
    usersCredited: number, 
    errors: string[]
  ): Promise<void> {
    await client.query(
      `UPDATE profit_runs 
       SET status = $1,
           completed_at = CURRENT_TIMESTAMP,
           total_investments_processed = $2,
           total_profit_distributed = $3,
           total_users_credited = $4,
           errors_count = $5,
           error_details = $6
       WHERE id = $7`,
      [
        errors.length > 0 ? 'partial' : 'completed',
        totalInvestments,
        totalProfitDistributed,
        usersCredited,
        errors.length,
        errors.length > 0 ? JSON.stringify(errors) : null,
        runId
      ]
    );
  }

  /**
   * Get profit run history
   */
  async getProfitRunHistory(limit: number = 30): Promise<any[]> {
    const query = `
      SELECT 
        id,
        run_type,
        run_date,
        started_at,
        completed_at,
        total_investments_processed,
        total_profit_distributed,
        total_users_credited,
        status,
        errors_count
      FROM profit_runs
      ORDER BY started_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get user's profit history
   */
  async getUserProfitHistory(userId: number, limit: number = 50): Promise<any[]> {
    const query = `
      SELECT 
        le.id,
        le.amount,
        le.description,
        le.created_at,
        i.amount as investment_amount,
        i.profit_rate
      FROM ledger_entries le
      LEFT JOIN investments i ON le.reference_id = i.id AND le.reference_type = 'investment'
      WHERE le.user_id = $1 
        AND le.transaction_type = 'profit'
      ORDER BY le.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Get investment level by amount
   */
  getInvestmentLevel(amount: number): InvestmentLevel | null {
    return INVESTMENT_LEVELS.find(level => 
      amount >= level.minAmount && amount <= level.maxAmount
    ) || null;
  }

  /**
   * Calculate potential daily profit for an amount
   */
  calculatePotentialProfit(amount: number): { level: InvestmentLevel | null; dailyProfit: number } {
    const level = this.getInvestmentLevel(amount);
    const dailyProfit = level ? (amount * level.rate) / 100 : 0;
    
    return { level, dailyProfit };
  }
}

export default new ProfitCalculationService();
