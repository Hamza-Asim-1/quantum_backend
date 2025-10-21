import axios from 'axios';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timeStamp: string;
  confirmations?: number;
}

// BEP20 (BSC) Scanner
export class BEP20Scanner {
  private apiKey: string;
  private baseUrl = 'https://api.bscscan.com/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get transactions to a specific address
  async getTransactions(address: string, startBlock: number = 0): Promise<Transaction[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'account',
          action: 'tokentx',
          address: address,
          startblock: startBlock,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.apiKey,
        },
      });

      if (response.data.status === '1' && Array.isArray(response.data.result)) {
        // Filter for USDT transactions only (USDT BEP20 contract)
        const usdtContract = '0x55d398326f99059fF775485246999027B3197955'; // USDT BEP20
        return response.data.result
          .filter((tx: any) => tx.contractAddress.toLowerCase() === usdtContract.toLowerCase())
          .map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: (parseInt(tx.value) / 1e18).toFixed(2), // Convert from wei to USDT
            blockNumber: tx.blockNumber,
            timeStamp: tx.timeStamp,
            confirmations: parseInt(tx.confirmations),
          }));
      }

      return [];
    } catch (error) {
      console.error('BSCScan API error:', error);
      return [];
    }
  }

  // Get latest block number
  async getLatestBlockNumber(): Promise<number> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.apiKey,
        },
      });

      return parseInt(response.data.result, 16);
    } catch (error) {
      console.error('Error getting latest block:', error);
      return 0;
    }
  }
}

// TRC20 (TRON) Scanner
export class TRC20Scanner {
  private apiKey: string;
  private baseUrl = 'https://api.trongrid.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get transactions to a specific address
  async getTransactions(address: string, minTimestamp: number = 0): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/accounts/${address}/transactions/trc20`, {
        headers: {
          'TRON-PRO-API-KEY': this.apiKey,
        },
        params: {
          limit: 200,
          min_timestamp: minTimestamp,
        },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        // Filter for USDT transactions only (USDT TRC20 contract)
        const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT TRC20
        return response.data.data
          .filter((tx: any) => 
            tx.token_info?.address === usdtContract && 
            tx.to.toLowerCase() === address.toLowerCase()
          )
          .map((tx: any) => ({
            hash: tx.transaction_id,
            from: tx.from,
            to: tx.to,
            value: (parseInt(tx.value) / 1e6).toFixed(2), // Convert to USDT (6 decimals)
            blockNumber: tx.block_timestamp.toString(),
            timeStamp: (tx.block_timestamp / 1000).toString(),
            confirmations: tx.confirmed ? 20 : 0, // TRC20 confirmations
          }));
      }

      return [];
    } catch (error) {
      console.error('TronGrid API error:', error);
      return [];
    }
  }

  // Get latest block
  async getLatestBlock(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/wallet/getnowblock`);
      return response.data.block_header?.raw_data?.number || 0;
    } catch (error) {
      console.error('Error getting latest block:', error);
      return 0;
    }
  }
}

// Unified Blockchain Service
export class BlockchainService {
  private bep20Scanner?: BEP20Scanner;
  private trc20Scanner?: TRC20Scanner;

  constructor() {
    const bscApiKey = process.env.BSCSCAN_API_KEY;
    const tronApiKey = process.env.TRONGRID_API_KEY;

    if (bscApiKey) {
      this.bep20Scanner = new BEP20Scanner(bscApiKey);
    } else {
      console.warn('⚠️  BSCSCAN_API_KEY not configured');
    }

    if (tronApiKey) {
      this.trc20Scanner = new TRC20Scanner(tronApiKey);
    } else {
      console.warn('⚠️  TRONGRID_API_KEY not configured');
    }
  }

  async scanBEP20Deposits(address: string, startBlock: number = 0): Promise<Transaction[]> {
    if (!this.bep20Scanner) {
      console.warn('BEP20 scanner not initialized');
      return [];
    }
    return await this.bep20Scanner.getTransactions(address, startBlock);
  }

  async scanTRC20Deposits(address: string, minTimestamp: number = 0): Promise<Transaction[]> {
    if (!this.trc20Scanner) {
      console.warn('TRC20 scanner not initialized');
      return [];
    }
    return await this.trc20Scanner.getTransactions(address, minTimestamp);
  }

  async getLatestBEP20Block(): Promise<number> {
    if (!this.bep20Scanner) return 0;
    return await this.bep20Scanner.getLatestBlockNumber();
  }

  async getLatestTRC20Block(): Promise<number> {
    if (!this.trc20Scanner) return 0;
    return await this.trc20Scanner.getLatestBlock();
  }
}

export default new BlockchainService();