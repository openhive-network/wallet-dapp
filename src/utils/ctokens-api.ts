import { useSettingsStore } from '@/stores/settings.store';

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
 * Provides methods to interact with the ctokens-api
 */
export class CTokensApiService {
  private baseUrl: string;

  public constructor (baseUrl: string = '/ctokens-api') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T> (endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null)
          url.searchParams.append(key, value.toString());
      });
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}. Response: ${errorText.substring(0, 200)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      throw new Error(`Expected JSON response but received ${contentType || 'unknown'}. Response: ${responseText.substring(0, 200)}`);
    }

    try {
      return await response.json();
    } catch (_parseError) {
      const responseText = await response.text();
      throw new Error(`Failed to parse JSON response. Content: ${responseText.substring(0, 200)}`);
    }
  }

  /**
   * Test API connectivity
   */
  public async testConnection (): Promise<boolean> {
    try {
      await this.getLastSyncedBlock();
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get API version
   */
  public async getVersion (): Promise<string> {
    return this.makeRequest<string>('/version');
  }

  /**
   * Get last synced block number
   */
  public async getLastSyncedBlock (): Promise<number> {
    return this.makeRequest<number>('/last-synced-block');
  }

  /**
   * Get account balances for a user
   */
  public async getAccountBalances (user: string, page: number = 1): Promise<CTokenBalance[]> {
    return this.makeRequest<CTokenBalance[]>('/balances', { user, page });
  }

  /**
   * Get balance history for a specific token and user
   */
  public async getBalanceHistory (
    user: string,
    nai: string,
    precision: number,
    page: number = 1
  ): Promise<CTokenBalanceHistory[]> {
    return this.makeRequest<CTokenBalanceHistory[]>('/balance-history', {
      user,
      nai,
      precision,
      page
    });
  }

  /**
   * Get list of registered tokens
   */
  public async getRegisteredTokens (nai?: string, precision?: number): Promise<CToken[]> {
    const params: Record<string, string | number> = {};
    if (nai) params.nai = nai;
    if (precision !== undefined) params.precision = precision;

    return this.makeRequest<CToken[]>('/registered-tokens', params);
  }

  /**
   * Get list of registered users
   */
  public async getRegisteredUsers (user?: string): Promise<CTokenUser[]> {
    const params: Record<string, string | number> = {};
    if (user) params.user = user;

    return this.makeRequest<CTokenUser[]>('/registered-users', params);
  }

  /**
   * Get top holders for a specific token
   */
  public async getTopHolders (nai: string, precision: number, page: number = 1): Promise<CTokenTopHolder[]> {
    return this.makeRequest<CTokenTopHolder[]>('/top-holders', {
      nai,
      precision,
      page
    });
  }

  /**
   * Get transaction status by reference ID
   * Returns status based on HTTP response codes:
   * - 404: Transaction pending (not found yet)
   * - 200: Transaction confirmed
   * - 400: Transaction failed (with error message)
   */
  public async getTransactionStatus (refId: string): Promise<TransactionStatusResult> {
    const url = new URL(`${this.baseUrl}/status`, window.location.origin);
    url.searchParams.append('refId', refId);

    try {
      const response = await fetch(url.toString());

      if (response.status === 404) {
        // Transaction is still pending
        return {
          status: 'pending',
          httpCode: 404,
          error: 'Transaction not found - still processing'
        };
      }

      if (response.status === 200) {
        // Transaction confirmed
        const data = await response.json();
        return {
          status: 'confirmed',
          httpCode: 200,
          data
        };
      }

      if (response.status === 400) {
        // Transaction failed
        const data = await response.json();
        return {
          status: 'failed',
          httpCode: 400,
          data,
          error: data.message || 'Transaction failed'
        };
      }

      // Unexpected status code
      const errorText = await response.text();
      return {
        status: 'failed',
        httpCode: response.status,
        error: `Unexpected response: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`
      };

    } catch (networkError) {
      return {
        status: 'failed',
        httpCode: 0,
        error: `Network error: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`
      };
    }
  }
}

// Create singleton instance with configurable URL
const getApiBaseUrl = (): string => {
  // Check for environment variable or default to local
  return import.meta.env.VITE_CTOKENS_API_URL || '/ctokens-api';
};

export const cTokensApi = new CTokensApiService(getApiBaseUrl());

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
 */
export const getUserOperationalKey = (): string => {
  const settingsStore = useSettingsStore();
  // For now, use the connected account name as operational key
  // In a real implementation, this would be derived from user's keys
  const account = settingsStore.settings.account;

  if (!account) {
    console.warn('No account connected - using empty operational key');
    return '';
  }

  return account;
};

/**
 * Transform CTokenBalance to legacy TokenBalance format
 */
export interface LegacyTokenBalance {
  symbol: string;
  name: string;
  nai: string;
  liquid_balance: string;
  staked_balance: string;
  total_balance: string;
  precision: number;
  logo_url?: string;
}

export const transformCTokenBalanceToLegacy = (
  balance: CTokenBalance,
  token: CToken
): LegacyTokenBalance => {
  const formattedAmount = formatCTokenAmount(balance.amount, balance.precision);

  return {
    symbol: getTokenSymbol(token),
    name: getTokenName(token),
    nai: balance.nai,
    liquid_balance: formattedAmount,
    staked_balance: '0.000', // ctokens-api doesn't distinguish liquid vs staked in balances endpoint
    total_balance: formattedAmount,
    precision: balance.precision,
    logo_url: getTokenLogoUrl(token)
  };
};

/**
 * Transform CToken to legacy TokenDefinition format
 */
export interface LegacyTokenDefinition {
  symbol: string;
  name: string;
  description: string;
  nai: string;
  initial_supply: string;
  current_supply: string;
  precision: number;
  can_stake: boolean;
  creator: string;
  created_at: string;
  active: boolean;
}

export const transformCTokenToLegacy = (token: CToken): LegacyTokenDefinition => {
  return {
    symbol: getTokenSymbol(token),
    name: getTokenName(token),
    description: getTokenDescription(token),
    nai: token.nai,
    initial_supply: formatCTokenAmount(token.total_supply, token.precision),
    current_supply: formatCTokenAmount(token.total_supply, token.precision),
    precision: token.precision,
    can_stake: canTokenStake(token),
    creator: token.owner,
    created_at: new Date().toISOString(), // ctokens-api doesn't provide creation date
    active: true // assume all registered tokens are active
  };
};

/**
 * Poll transaction status until it's no longer pending
 * @param refId - Transaction reference ID
 * @param maxAttempts - Maximum number of polling attempts
 * @param intervalMs - Polling interval in milliseconds
 * @returns Promise resolving to final transaction status
 */
export const pollTransactionStatus = async (
  refId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<TransactionStatusResult> => {
  const apiService = cTokensApi;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await apiService.getTransactionStatus(refId);

    // If status is not pending, return immediately
    if (result.status !== 'pending')
      return result;

    // If this was the last attempt, return the pending status
    if (attempt === maxAttempts) {
      return {
        ...result,
        error: `Transaction still pending after ${maxAttempts} attempts`
      };
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // This should never be reached, but TypeScript requires it
  return {
    status: 'failed',
    httpCode: 0,
    error: 'Polling completed without result'
  };
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
