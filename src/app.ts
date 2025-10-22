// src/app.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as compression from 'compression';
import morgan from 'morgan';
import logger, { morganStream } from './utils/logger';
import { 
  securityHeaders, 
  generalRateLimit, 
  requestId, 
  requestLogger,
  corsConfig 
} from './middleware/security';
import { 
  globalErrorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import kycRoutes from './routes/kycRoutes';
import depositRoutes from './routes/depositRoutes';
import withdrawalRoutes from './routes/withdrawalRoutes';
import transactionHistoryRoutes from './routes/transactionHistoryRoutes';
import investmentRoutes from './routes/investmentRoutes';
import accountsRoutes from './routes/accountsRoutes';
import walletRoutes from './routes/walletRoutes';
import healthRoutes from './routes/healthRoutes';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);

// Request ID middleware
app.use(requestId);

// Request logging
app.use(requestLogger);

// Morgan HTTP logger
app.use(morgan('combined', { stream: morganStream }));

// CORS
app.use(cors(corsConfig));

// Compression middleware
app.use(compression.default());

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Routes
app.use('/health', healthRoutes);

// API Version Route
app.get('/api/v1', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Investment Platform API',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
logger.info('🔧 Registering routes...');
app.use('/api/v1/auth', authRoutes);
logger.info('   ✓ /api/v1/auth');
app.use('/api/v1/admin', adminRoutes);
logger.info('   ✓ /api/v1/admin');
app.use('/api/v1/kyc', kycRoutes);
logger.info('   ✓ /api/v1/kyc');
app.use('/api/v1/deposits', depositRoutes);
logger.info('   ✓ /api/v1/deposits');
app.use('/api/v1/withdrawals', withdrawalRoutes);
logger.info('   ✓ /api/v1/withdrawals');
app.use('/api/v1/transactions', transactionHistoryRoutes);
logger.info('   ✓ /api/v1/transactions');
app.use('/api/v1/investments', investmentRoutes);
logger.info('   ✓ /api/v1/investments');
app.use('/api/v1/accounts', accountsRoutes);
logger.info('   ✓ /api/v1/accounts');
app.use('/api/v1/wallets', walletRoutes);
logger.info('   ✓ /api/v1/wallets');

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;