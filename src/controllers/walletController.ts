// backend/src/controllers/walletController.ts
import { Request, Response } from 'express';

// Get platform wallet addresses for deposits
export const getPlatformAddresses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const addresses = {
      BEP20: process.env.PLATFORM_BEP20_ADDRESS || '',
      TRC20: process.env.PLATFORM_TRC20_ADDRESS || '',
    };

    // Validate addresses exist
    if (!addresses.BEP20 || !addresses.TRC20) {
      res.status(500).json({
        status: 'error',
        message: 'Platform wallet addresses not configured',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        addresses,
        instructions: {
          BEP20: 'Send only USDT on Binance Smart Chain (BEP20) network to this address',
          TRC20: 'Send only USDT on TRON (TRC20) network to this address',
        },
        warning: 'Sending any other token or using wrong network will result in loss of funds',
      },
    });
  } catch (error) {
    console.error('Get platform addresses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch platform addresses',
    });
  }
};