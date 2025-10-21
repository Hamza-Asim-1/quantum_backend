// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import kycRoutes from './routes/kycRoutes';
import depositRoutes from './routes/depositRoutes';
import withdrawalRoutes from './routes/withdrawalRoutes';
import transactionHistoryRoutes from './routes/transactionHistoryRoutes';
import investmentRoutes from './routes/investmentRoutes';
import accountsRoutes from './routes/accountsRoutes';
import walletRoutes from './routes/walletRoutes';
dotenv.config();

const app = express();
// backend/src/app.ts
// Add this import at the top with other route imports:


// Add this route registration with other routes:

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Vite default
    'http://localhost:8080',  // Your frontend port
    'http://localhost:3000',  // Backend (for same-origin)
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Version Route
app.get('/api/v1', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Investment Platform API',
    version: 'v1',
  });
});
app.use('/investments', investmentRoutes);

// API Routes
console.log('🔧 Registering routes...');
app.use('/api/v1/auth', authRoutes);
console.log('   ✓ /api/v1/auth');
app.use('/api/v1/admin', adminRoutes);
console.log('   ✓ /api/v1/admin');
app.use('/api/v1/kyc', kycRoutes);
console.log('   ✓ /api/v1/kyc');
app.use('/api/v1/deposits', depositRoutes);
console.log('   ✓ /api/v1/deposits');
app.use('/api/v1/withdrawals', withdrawalRoutes);
console.log('   ✓ /api/v1/withdrawals');
app.use('/api/v1/transactions', transactionHistoryRoutes); // ADD THIS LINE
console.log('   ✓ /api/v1/transactions'); // ADD THIS LINE
app.use('/api/v1/investments', investmentRoutes);
console.log('   ✓ /api/v1/investments'); // ADD THIS LINE
app.use('/api/v1/accounts', accountsRoutes);

console.log('   ✓ /api/v1/accounts');
app.use('/api/v1/wallets', walletRoutes);


// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path,
  });
});

// Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

export default app;