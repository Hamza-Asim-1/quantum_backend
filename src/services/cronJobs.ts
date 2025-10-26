import cron from 'node-cron';
import depositScannerService from './depositScannerService';
import profitCalculationService from './profitCalculationService';
import logger from '../utils/logger';

export class CronJobService {
  // Mark as any to avoid namespace typing issues from @types/node-cron
  private depositScanJob: any = null;
  private profitDistributionJob: any = null;

  // Start deposit scanner cron job
  startDepositScanner() {
    const intervalMinutes = parseInt(process.env.DEPOSIT_SCAN_INTERVAL_MINUTES || '5');
    
    // Validate interval
    if (intervalMinutes < 1 || intervalMinutes > 60) {
      console.error('❌ Invalid DEPOSIT_SCAN_INTERVAL_MINUTES. Must be between 1-60');
      return;
    }

    // Create cron expression (every N minutes)
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.depositScanJob = cron.schedule(cronExpression, async () => {
      try {
        await depositScannerService.runScan();
      } catch (error) {
        console.error('❌ Deposit scan error:', error);
      }
    });

    console.log(`✅ Deposit scanner started (runs every ${intervalMinutes} minutes)`);
    console.log(`   Cron expression: ${cronExpression}`);
    
    // Run initial scan immediately
    console.log('🚀 Running initial deposit scan...');
    setTimeout(() => {
      depositScannerService.runScan().catch(console.error);
    }, 5000); // Wait 5 seconds for server to fully start
  }

  // Stop deposit scanner
  stopDepositScanner() {
    if (this.depositScanJob) {
      this.depositScanJob.stop();
      console.log('⏹️  Deposit scanner stopped');
    }
  }

  // Start daily profit distribution cron job
  startProfitDistribution() {
    // Run daily at 00:01 (1 minute after midnight)
    this.profitDistributionJob = cron.schedule('1 0 * * *', async () => {
      try {
        logger.info('🔄 Starting daily profit distribution...');
        const result = await profitCalculationService.distributeDailyProfits();
        logger.info('✅ Daily profit distribution completed', {
          runId: result.runId,
          totalInvestments: result.totalInvestments,
          usersCredited: result.usersCredited,
          totalProfitDistributed: result.totalProfitDistributed,
          errors: result.errors.length
        });
      } catch (error) {
        logger.error('❌ Daily profit distribution failed:', error);
      }
    }, {
      timezone: 'UTC'
    });

    this.profitDistributionJob.start();
    logger.info('✅ Daily profit distribution scheduled (runs at 00:01 UTC)');
  }

  // Stop profit distribution
  stopProfitDistribution() {
    if (this.profitDistributionJob) {
      this.profitDistributionJob.stop();
      logger.info('⏹️  Daily profit distribution stopped');
    }
  }

  // Start all cron jobs
  startAll() {
    logger.info('\n⏰ Initializing cron jobs...');
    this.startDepositScanner();
    this.startProfitDistribution();
    logger.info('✅ All cron jobs started\n');
  }

  // Stop all cron jobs
  stopAll() {
    logger.info('\n⏹️  Stopping all cron jobs...');
    this.stopDepositScanner();
    this.stopProfitDistribution();
    logger.info('✅ All cron jobs stopped\n');
  }
}

export default new CronJobService();