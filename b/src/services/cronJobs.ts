import cron from 'node-cron';
import depositScannerService from './depositScannerService';

export class CronJobService {
  // Mark as any to avoid namespace typing issues from @types/node-cron
  private depositScanJob: any = null;

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

  // Start all cron jobs
  startAll() {
    console.log('\n⏰ Initializing cron jobs...');
    this.startDepositScanner();
    console.log('✅ All cron jobs started\n');
  }

  // Stop all cron jobs
  stopAll() {
    console.log('\n⏹️  Stopping all cron jobs...');
    this.stopDepositScanner();
    console.log('✅ All cron jobs stopped\n');
  }
}

export default new CronJobService();