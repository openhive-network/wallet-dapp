import type { TWaxRestExtended, IHiveChainInterface } from '@hiveio/wax';

import { getWax } from '@/stores/wax.store';
import type {
  CtokensAppBalance,
  CtokensAppBalanceHistory,
  CtokensAppTransactionStatusResponse,
  CtokensAppArrayOfTokens,
  CtokensAppArrayOfUsers,
  CtokensAppArrayOfTopHolders
} from '@/utils/wallet/ctokens/api';

import type RestApi from '../utils/wallet/ctokens/api';


// Types based on ctokens-api OpenAPI specification

export interface CTokenBalance {
  nai: string;
  amount: string;
  precision: number;
  metadata?: Record<string, unknown>;
}

export interface CToken {
  nai: string;
  owner: string;
  precision: number;
  total_supply: string;
  max_supply: string;
  capped: boolean;
  others_can_stake: boolean;
  others_can_unstake: boolean;
  is_nft: boolean;
  metadata?: Record<string, unknown>;
}

export interface CTokenUser {
  management_key: string;
  operational_key: string;
  hive_account?: string;
  metadata?: Record<string, unknown>;
}

export interface CTokenTopHolder {
  rank: number;
  user: string;
  amount: string;
  metadata?: Record<string, unknown>;
}

export interface CTokenBalanceHistory {
  history_seq_no: number;
  balance: string;
  prev_balance: string;
  balance_change: string;
  timestamp: string;
}

export interface CTokenTransactionStatus {
  code: string;
  details: string;
  hint: string;
  message: string;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionStatusResult {
  status: TransactionStatus;
  httpCode: number;
  data?: CTokenTransactionStatus;
  error?: string;
}

/**
 * Custom Tokens API Service
 * Provides methods to interact with the ctokens-api through wax extension
 */
export class CTokensApiService {
  private readonly extendedChain: TWaxRestExtended<typeof RestApi, IHiveChainInterface>;

  public constructor (extendedChain: TWaxRestExtended<typeof RestApi, IHiveChainInterface>) {
    this.extendedChain = extendedChain;
  }

  /**
   * Test API connectivity
   */
  public async testConnection (): Promise<boolean> {
    try {
      await this.extendedChain.restApi.ctokensApi.lastSyncedBlock();
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get API version
   */
  public async getVersion (): Promise<string> {
    return await this.extendedChain.restApi.ctokensApi.version();
  }

  /**
   * Get last synced block number
   */
  public async getLastSyncedBlock (): Promise<number> {
    return await this.extendedChain.restApi.ctokensApi.lastSyncedBlock();
  }

  /**
   * Get account balances for a user
   */
  public async getAccountBalances (user: string, page: number = 1): Promise<CtokensAppBalance[]> {
    return await this.extendedChain.restApi.ctokensApi.balances({ user, page });
  }

  /**
   * Get balance history for a specific token and user
   */
  public async getBalanceHistory (
    user: string,
    nai: string,
    precision: number,
    page: number = 1
  ): Promise<CtokensAppBalanceHistory[]> {
    return await this.extendedChain.restApi.ctokensApi.balanceHistory({
      user,
      nai,
      precision,
      page
    });
  }

  /**
   * Get list of registered tokens
   */
  public async getRegisteredTokens (nai?: string, precision?: number): Promise<CtokensAppArrayOfTokens> {
    const params: Record<string, string | number> = {};
    if (nai) params.nai = nai;
    if (precision !== undefined) params.precision = precision;

    return await this.extendedChain.restApi.ctokensApi.registeredTokens(params);;
  }

  /**
   * Get list of registered users
   */
  public async getRegisteredUsers (user?: string): Promise<CtokensAppArrayOfUsers> {
    const params: Record<string, string> = {};
    if (user) params.user = user;

    return await this.extendedChain.restApi.ctokensApi.registeredUsers(params);
  }

  /**
   * Get top holders for a specific token
   */
  public async getTopHolders (nai: string, precision: number, page: number = 1): Promise<CtokensAppArrayOfTopHolders> {
    return await this.extendedChain.restApi.ctokensApi.topHolders({
      nai,
      precision,
      page
    });
  }

  /**
   * Get transaction status by reference ID
   * Returns status based on API response:
   * - API returns result: Transaction confirmed
   * - API throws error: Transaction failed or pending
   */
  public async getTransactionStatus (refId: string): Promise<CtokensAppTransactionStatusResponse> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    return await this.extendedChain.restApi.ctokensApi.status({ 'ref-id': refId });
  }
}

// Lazy initialization to avoid top-level await
let _cTokensApiInstance: CTokensApiService | null = null;

// Get or create singleton instance
export const getCTokensApi = async (): Promise<CTokensApiService> => {
  if (!_cTokensApiInstance) {
    const wax = await getWax();
    _cTokensApiInstance = new CTokensApiService(wax);
  }
  return _cTokensApiInstance;
};

// Factory function to create instance with specific wax instance
export const createCTokensApiService = (waxInstance: Awaited<ReturnType<typeof getWax>>): CTokensApiService => {
  return new CTokensApiService(waxInstance);
};

/**
 * Enhanced token utilities that integrate with ctokens-api
 */

/**
 * Format token amount with precision from ctokens-api
 */
export const formatCTokenAmount = (amount: string, precision: number): string => {
  const num = parseFloat(amount);
  return (num / Math.pow(10, precision)).toFixed(precision);
};

/**
 * Parse token amount to API format (with precision)
 */
export const parseCTokenAmount = (amount: string, precision: number): string => {
  const num = parseFloat(amount);
  return Math.floor(num * Math.pow(10, precision)).toString();
};

/**
 * Get token symbol from metadata
 */
export const getTokenSymbol = (token: CToken): string => {
  const metadata = token.metadata as { symbol?: string } | undefined;
  return metadata?.symbol || token.nai;
};

/**
 * Get token name from metadata
 */
export const getTokenName = (token: CToken): string => {
  const metadata = token.metadata as { name?: string } | undefined;
  return metadata?.name || token.nai;
};

/**
 * Get token description from metadata
 */
export const getTokenDescription = (token: CToken): string => {
  const metadata = token.metadata as { description?: string } | undefined;
  return metadata?.description || '';
};

/**
 * Get token logo URL from metadata
 */
export const getTokenLogoUrl = (token: CToken): string | undefined => {
  const metadata = token.metadata as { logo_url?: string } | undefined;
  return metadata?.logo_url;
};

/**
 * Check if token supports staking
 */
export const canTokenStake = (token: CToken): boolean => {
  return token.others_can_stake || token.others_can_unstake;
};

/**
 * Get user's operational key (for API calls)
 * Returns the operational public key from the user's wallet
 */
export const getUserOperationalKey = async (): Promise<string> => {
  // Import CTokensProvider to access the actual operational key from wallet
  const { CTokensProvider } = await import('@/utils/wallet/ctokens/signer');

  const operationalKey = CTokensProvider.getOperationalPublicKey();

  if (!operationalKey) {
    console.warn('No operational key available - user may not be logged in');
    return '';
  }

  return operationalKey;
};

/**
 * Get user-friendly status message
 */
export const getTransactionStatusMessage = (result: TransactionStatusResult): string => {
  switch (result.status) {
  case 'pending':
    return 'Transaction is being processed...';
  case 'confirmed':
    return 'Transaction confirmed successfully!';
  case 'failed':
    return result.error || 'Transaction failed';
  default:
    return 'Unknown transaction status';
  }
};

/**
 * Check if transaction status indicates completion (success or failure)
 */
export const isTransactionComplete = (result: TransactionStatusResult): boolean => {
  return result.status === 'confirmed' || result.status === 'failed';
};
