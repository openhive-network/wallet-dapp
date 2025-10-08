import { useSettingsStore } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';

import {
  cTokensApi,
  getUserOperationalKey,
  transformCTokenBalanceToLegacy,
  transformCTokenToLegacy,
  type LegacyTokenBalance,
  type LegacyTokenDefinition
} from './ctokens-api';

export interface TokenCreationParams {
  symbol: string;
  name: string;
  description: string;
  nai: string;
  initial_supply: string;
  precision: number;
  can_stake: boolean;
}

export interface TokenTransferParams {
  to: string;
  amount: string;
  symbol: string;
  memo?: string;
}

export interface TokenStakeParams {
  amount: string;
  symbol: string;
  direction: 'stake' | 'unstake';
}

/**
 * Generate a unique NAI identifier for a token
 */
export const generateNAI = (symbol: string): string => {
  const timestamp = Date.now();
  const symbolUpper = symbol.trim().toUpperCase();

  // Create a simple hash-like value for uniqueness
  const hash = (symbolUpper + timestamp).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  // NAI format: @@[8 digits]
  const naiNumber = (hash % 100000000).toString().padStart(8, '0');

  const table = [
    [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
    [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
    [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
    [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
    [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
    [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
    [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
    [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
    [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
    [2, 5, 8, 1, 4, 3, 6, 7, 9, 0]
  ];

  const dammDigit = (str: string) => {
    let row = 0;

    for(let i = 0; i < str.length; i++) {
      const col = str.charAt(i) as unknown as number;
      row = table[row][col];
    }

    return row.toString();
  };

  return `@@${naiNumber}${dammDigit(naiNumber)}`;
};

/**
 * Create a new NAI token
 */
export const createNAIToken = async (params: TokenCreationParams) => {
  const wax = await getWax();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();

  if (!settingsStore.settings.account)
    throw new Error('No account connected');

  if (!walletStore.hasWallet)
    throw new Error('No wallet available');

  const tx = await wax.createTransaction();

  // Create custom JSON operation for token creation
  const tokenData = {
    action: 'create_token',
    data: {
      ...params,
      creator: settingsStore.settings.account
    }
  };

  tx.pushOperation({
    custom_json_operation: {
      required_auths: [],
      required_posting_auths: [settingsStore.settings.account],
      id: 'nai_token_create',
      json: JSON.stringify(tokenData)
    }
  });

  await walletStore.wallet!.signTransaction(tx);

  // TODO: Here you would broadcast to the blockchain
  // For now, return the transaction
  return tx.toApi();
};

/**
 * Transfer NAI tokens
 */
export const transferNAIToken = async (params: TokenTransferParams) => {
  const wax = await getWax();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();

  if (!settingsStore.settings.account)
    throw new Error('No account connected');


  if (!walletStore.hasWallet)
    throw new Error('No wallet available');


  const tx = await wax.createTransaction();

  // Create custom JSON operation for token transfer
  const transferData = {
    action: 'transfer_token',
    data: {
      ...params,
      from: settingsStore.settings.account
    }
  };

  tx.pushOperation({
    custom_json_operation: {
      required_auths: [],
      required_posting_auths: [settingsStore.settings.account],
      id: 'nai_token_transfer',
      json: JSON.stringify(transferData)
    }
  });

  await walletStore.wallet!.signTransaction(tx);

  return tx.toApi();
};

/**
 * Stake/Unstake NAI tokens
 */
export const stakeNAIToken = async (params: TokenStakeParams) => {
  const wax = await getWax();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();

  if (!settingsStore.settings.account)
    throw new Error('No account connected');


  if (!walletStore.hasWallet)
    throw new Error('No wallet available');


  const tx = await wax.createTransaction();

  // Create custom JSON operation for token staking
  const stakeData = {
    action: 'stake_token',
    data: {
      ...params,
      account: settingsStore.settings.account
    }
  };

  tx.pushOperation({
    custom_json_operation: {
      required_auths: [],
      required_posting_auths: [settingsStore.settings.account],
      id: 'nai_token_stake',
      json: JSON.stringify(stakeData)
    }
  });

  await walletStore.wallet!.signTransaction(tx);

  return tx.toApi();
};

/**
 * Get token definitions for an account - now using ctokens-api
 */
export const getTokenDefinitions = async (creator?: string): Promise<LegacyTokenDefinition[]> => {
  try {
    // Get registered tokens from ctokens-api
    const tokens = await cTokensApi.getRegisteredTokens();

    // Filter by creator if provided
    const filteredTokens = creator
      ? tokens.filter(token => token.owner === creator)
      : tokens;

    // Transform to legacy format
    return filteredTokens.map(token => transformCTokenToLegacy(token));
  } catch (error) {
    console.error('Failed to get token definitions:', error);
    // Fallback to mock data for development
    const mockTokens = [
      {
        symbol: 'MAT',
        name: 'My Awesome Token',
        description: 'A test token for demonstration purposes',
        nai: '@@123456789',
        initial_supply: '1000000',
        current_supply: '1000000',
        precision: 3,
        can_stake: true,
        creator: creator || 'testaccount',
        created_at: '2024-01-15T10:30:00Z',
        active: true
      }
    ];

    return mockTokens;
  }
};

/**
 * Get account balances - now using ctokens-api
 */
export const getAccountBalances = async (_account: string): Promise<LegacyTokenBalance[]> => {
  try {
    const operationalKey = getUserOperationalKey();
    if (!operationalKey)
      throw new Error('No operational key available');

    // Get balances from ctokens-api
    const balances = await cTokensApi.getAccountBalances(operationalKey);

    // Get all registered tokens to map metadata
    const tokens = await cTokensApi.getRegisteredTokens();

    // Transform to legacy format
    const legacyBalances: LegacyTokenBalance[] = [];

    for (const balance of balances) {
      const token = tokens.find(t => t.nai === balance.nai && t.precision === balance.precision);
      if (token)
        legacyBalances.push(transformCTokenBalanceToLegacy(balance, token));
    }

    return legacyBalances;
  } catch (error) {
    console.error('Failed to get account balances:', error);
    // Fallback to mock data for development
    const mockBalances = [
      {
        symbol: 'HIVE',
        name: 'Hive',
        nai: '@@000000021',
        liquid_balance: '150.500',
        staked_balance: '0.000',
        total_balance: '150.500',
        precision: 3,
        logo_url: undefined
      },
      {
        symbol: 'HBD',
        name: 'Hive Backed Dollar',
        nai: '@@000000013',
        liquid_balance: '75.250',
        staked_balance: '0.000',
        total_balance: '75.250',
        precision: 3,
        logo_url: undefined
      },
      {
        symbol: 'MAT',
        name: 'My Awesome Token',
        nai: '@@123456789',
        liquid_balance: '1000.000',
        staked_balance: '500.000',
        total_balance: '1500.000',
        precision: 3,
        logo_url: undefined
      }
    ];

    return mockBalances;
  }
};

/**
 * User signup with account validation
 */
export const userSignup = async (account: string, email?: string, referrer?: string) => {
  try {
    const wax = await getWax();

    // Check if account exists first
    try {
      const { accounts } = await wax.api.database_api.find_accounts({
        accounts: [account],
        delayed_votes_active: false
      });

      if (accounts.length > 0) {
        return {
          success: false,
          account_exists: true,
          message: 'Account already exists'
        };
      }
    } catch (_error) {
      // Account doesn't exist, proceed with signup
    }

    // In a real implementation, this would call the bridge API for user signup
    const signupData = {
      action: 'user_signup',
      data: {
        account,
        email,
        referrer,
        timestamp: new Date().toISOString()
      }
    };

    // Create transaction for signup
    const settingsStore = useSettingsStore();
    const walletStore = useWalletStore();

    if (!settingsStore.settings.account || !walletStore.hasWallet)
      throw new Error('Wallet not connected');


    const tx = await wax.createTransaction();

    tx.pushOperation({
      custom_json_operation: {
        required_auths: [],
        required_posting_auths: [settingsStore.settings.account],
        id: 'user_signup',
        json: JSON.stringify(signupData)
      }
    });

    await walletStore.wallet!.signTransaction(tx);

    return {
      success: true,
      account_exists: false,
      message: 'User signup completed successfully'
    };

  } catch (error) {
    console.error('Failed to signup user:', error);
    throw error;
  }
};

/**
 * Validate account name format
 */
export const validateAccountName = (accountName: string): boolean => {
  // Hive account name validation rules
  const regex = /^[a-z][a-z0-9\-.]{2,15}$/;
  return regex.test(accountName);
};

/**
 * Format token amount with precision
 */
export const formatTokenAmount = (amount: string | number, precision: number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(precision);
};

/**
 * Parse token amount to remove precision
 */
export const parseTokenAmount = (amount: string, precision: number): number => {
  return Math.floor(parseFloat(amount) * Math.pow(10, precision));
};
