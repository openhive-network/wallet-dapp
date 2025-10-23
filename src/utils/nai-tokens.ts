import { HtmTransaction } from '@mtyszczak-cargo/htm';

import { useSettingsStore } from '@/stores/settings.store';
import { isVesting, useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';

import {
  getCTokensApi,
  getUserOperationalKey
} from './ctokens-api';
import type { CtokensAppArrayOfTokens } from './wallet/ctokens/api';
import CTokensProvider from './wallet/ctokens/signer';

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
  nai: string;
  precision: number;
  memo?: string;
}

export interface TokenStakeParams {
  amount: string;
  nai: string;
  precision: number;
  direction: 'stake' | 'unstake';
  receiver?: string;
}

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

const assetNumFromNAI = (nai: string, precision: number): number => {
  return (Number.parseInt(nai.slice(2, -1)) << 5) | 0x10 | precision;
};

const generateRandomNAI = (symbol: string): string => {
  const timestamp = Date.now();
  const symbolUpper = symbol.trim().toUpperCase();

  // Create a hash-like value for uniqueness using a safer approach
  // Use modular arithmetic to prevent overflow
  const input = symbolUpper + timestamp;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    // Use bitwise operations and modular arithmetic to prevent overflow
    hash = ((hash << 5) - hash + char) & 0x7fffffff; // Keep within 31-bit positive range
  }

  // Ensure we have a positive number and convert to 8-digit string
  const naiNumber = Math.abs(hash % 100000000).toString().padStart(8, '0');

  return `@@${naiNumber}${dammDigit(naiNumber)}`;
};

export const toVesting = (nai: string, precision: number): string => {
  const vestingNum = assetNumFromNAI(nai, precision) ^ 0x20;

  const naiVesting = (vestingNum >> 5).toString().padStart(8, '0');

  return `@@${naiVesting}${dammDigit(naiVesting)}`;
};

/**
 * Generate a unique NAI identifier for a token (liquid, not vesting)
 */
export const generateNAI = (symbol: string, precision: number): string => {
  let randomNAI: string;
  do
    randomNAI = generateRandomNAI(symbol);
  while (isVesting(randomNAI, precision)); // Keep generating until we get a liquid (non-vesting) NAI
  return randomNAI;
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
      id: 'htm',
      json: JSON.stringify(tokenData)
    }
  });

  await walletStore.wallet!.signTransaction(tx);

  // Broadcast the transaction to the blockchain
  await wax.broadcast(tx);

  return tx.id.toString();
};

/**
 * Transfer NAI tokens
 */
export const transferNAIToken = async (params: TokenTransferParams) => {
  const wax = await getWax();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const tokensStore = useTokensStore();

  if (!settingsStore.settings.account)
    throw new Error('No account connected');

  if (!walletStore.hasWallet)
    throw new Error('No wallet available');

  // Check if HTM wallet is connected
  if (!tokensStore.wallet)
    throw new Error('Please connect your HTM wallet first');

  // For fee payment
  await walletStore.createWalletFor(settingsStore.settings, 'active');

  // Reset tokens store with CTokens provider
  await tokensStore.reset(await CTokensProvider.for(wax, 'active'));

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = settingsStore.settings.account;

  // Create Layer 2 HTM transaction for token transfer
  const l2Transaction = new HtmTransaction(wax);

  l2Transaction.pushOperation({
    token_transfer_operation: {
      sender: tokensStore.wallet.publicKey!,
      receiver: params.to,
      amount: {
        amount: params.amount,
        nai: params.nai,
        precision: params.precision
      },
      memo: params.memo || ''
    }
  });

  await tokensStore.wallet!.signTransaction(l2Transaction);

  // Create Layer 1 transaction and broadcast
  const l1Transaction = await wax.createTransaction();

  // Add the L2 transaction as an operation in L1 transaction
  l1Transaction.pushOperation(l2Transaction);

  // Sign Layer 1 transaction with the Hive active key
  await walletStore.wallet!.signTransaction(l1Transaction);

  // Broadcast the transaction
  await wax.broadcast(l1Transaction);

  return l1Transaction.legacy_id;
};

/**
 * Stake/Unstake NAI tokens
 */
export const stakeNAIToken = async (params: TokenStakeParams) => {
  const wax = await getWax();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const tokensStore = useTokensStore();

  if (!settingsStore.settings.account)
    throw new Error('No account connected');

  if (!walletStore.hasWallet)
    throw new Error('No wallet available');

  // Check if HTM wallet is connected
  if (!tokensStore.wallet)
    throw new Error('Please connect your HTM wallet first');

  // For fee payment
  await walletStore.createWalletFor(settingsStore.settings, 'active');

  // Reset tokens store with CTokens provider
  await tokensStore.reset(await CTokensProvider.for(wax, 'active'));

  // Set proxy account for HTM transactions
  HtmTransaction.HiveProxyAccount = settingsStore.settings.account;

  // Create Layer 2 HTM transaction for token transform (stake/unstake)
  const l2Transaction = new HtmTransaction(wax);

  l2Transaction.pushOperation({
    // @ts-expect-error TODO: Interface issue to resolve
    token_transform_operation: {
      holder: tokensStore.wallet.publicKey,
      receiver: params.receiver || undefined,
      amount: {
        amount: params.amount,
        nai: params.nai,
        precision: params.precision
      }
    }
  });

  await tokensStore.wallet!.signTransaction(l2Transaction);

  // Create Layer 1 transaction and broadcast
  const l1Transaction = await wax.createTransaction();

  // Add the L2 transaction as an operation in L1 transaction
  l1Transaction.pushOperation(l2Transaction);

  // Sign Layer 1 transaction with the Hive active key
  await walletStore.wallet!.signTransaction(l1Transaction);

  // Broadcast the transaction
  await wax.broadcast(l1Transaction);

  return l1Transaction.legacy_id;
};

/**
 * Get token definitions for an account - now using ctokens-api
 */
export const getTokenDefinitions = async (creator?: string): Promise<CtokensAppArrayOfTokens> => {
  try {
    // Get registered tokens from ctokens-api
    const cTokensApi = await getCTokensApi();
    const tokens = await cTokensApi.getRegisteredTokens();

    // Filter by creator if provided
    return creator ? tokens.filter(token => token.owner === creator) : tokens;
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
export const getAccountBalances = async (): Promise<CtokensAppArrayOfTokens> => {
  try {
    const operationalKey = await getUserOperationalKey();
    if (!operationalKey)
      throw new Error('No operational key available');

    // Get balances from ctokens-api
    const cTokensApi = await getCTokensApi();
    return await cTokensApi.getAccountBalances(operationalKey);
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

    // Broadcast the transaction to the blockchain
    await wax.broadcast(tx);

    return {
      success: true,
      account_exists: false,
      message: 'User signup completed successfully',
      transaction_id: tx.id.toString()
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
 * Parse token amount to remove precision
 */
export const parseTokenAmount = (amount: string, precision: number): number => {
  return Math.floor(parseFloat(amount) * Math.pow(10, precision));
};
