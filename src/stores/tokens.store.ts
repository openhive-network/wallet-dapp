import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import {
  cTokensApi,
  getUserOperationalKey,
  transformCTokenBalanceToLegacy,
  transformCTokenToLegacy,
  type CTokenBalanceHistory,
  type CTokenTopHolder,
  type LegacyTokenBalance,
  type LegacyTokenDefinition
} from '@/utils/ctokens-api';

export const useTokensStore = defineStore('tokens', () => {
  // State
  const balances = ref<LegacyTokenBalance[]>([]);
  const tokenDefinitions = ref<LegacyTokenDefinition[]>([]);
  const isLoadingBalances = ref(false);
  const isLoadingTokens = ref(false);
  const lastError = ref<string | null>(null);

  // Computed
  const totalValue = computed(() => {
    return balances.value.reduce((total, balance) => {
      // Mock price of $0.01 per token for now
      const price = 0.01;
      const amount = parseFloat(balance.total_balance);
      return total + (amount * price);
    }, 0);
  });

  const tokenCount = computed(() => balances.value.length);

  const hasBalances = computed(() => balances.value.length > 0);

  const hasTokenDefinitions = computed(() => tokenDefinitions.value.length > 0);

  // Actions
  const loadBalances = async (forceRefresh = false) => {
    const operationalKey = getUserOperationalKey();

    if (!operationalKey) {
      lastError.value = 'No operational key available';
      return;
    }

    if (isLoadingBalances.value && !forceRefresh) return;

    isLoadingBalances.value = true;
    lastError.value = null;

    try {
      // Test API connectivity first
      const isApiAvailable = await cTokensApi.testConnection();

      if (!isApiAvailable)
        throw new Error('ctokens-api is not available. Using fallback data.');

      // Get balances from ctokens-api
      const cTokenBalances = await cTokensApi.getAccountBalances(operationalKey);

      // Get all registered tokens to map metadata
      const tokens = await cTokensApi.getRegisteredTokens();

      // Transform to legacy format
      const legacyBalances: LegacyTokenBalance[] = [];

      for (const balance of cTokenBalances) {
        const token = tokens.find(t => t.nai === balance.nai && t.precision === balance.precision);
        if (token)
          legacyBalances.push(transformCTokenBalanceToLegacy(balance, token));
      }

      balances.value = legacyBalances;
    } catch (error) {
      console.error('Failed to load balances:', error);
      lastError.value = error instanceof Error ? error.message : 'Failed to load balances';

      // Fallback to mock data for development
      console.log('Using fallback mock data for development');
      balances.value = [
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
    } finally {
      isLoadingBalances.value = false;
    }
  };

  const loadTokenDefinitions = async (creator?: string, forceRefresh = false) => {
    if (isLoadingTokens.value && !forceRefresh) return;

    isLoadingTokens.value = true;
    lastError.value = null;

    try {
      // Test API connectivity first
      const isApiAvailable = await cTokensApi.testConnection();

      if (!isApiAvailable)
        throw new Error('ctokens-api is not available. Using fallback data.');

      // Get registered tokens from ctokens-api
      const tokens = await cTokensApi.getRegisteredTokens();

      // Filter by creator if provided
      const filteredTokens = creator
        ? tokens.filter(token => token.owner === creator)
        : tokens;

      // Transform to legacy format
      tokenDefinitions.value = filteredTokens.map(token => transformCTokenToLegacy(token));
    } catch (error) {
      console.error('Failed to load token definitions:', error);
      lastError.value = error instanceof Error ? error.message : 'Failed to load token definitions';

      // Fallback to mock data for development
      console.log('Using fallback mock data for token definitions');
      tokenDefinitions.value = [
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
    } finally {
      isLoadingTokens.value = false;
    }
  };

  const getBalanceHistory = async (nai: string, precision: number, page = 1): Promise<CTokenBalanceHistory[]> => {
    const operationalKey = getUserOperationalKey();
    if (!operationalKey)
      throw new Error('No operational key available');

    return cTokensApi.getBalanceHistory(operationalKey, nai, precision, page);
  };

  const getTopHolders = async (nai: string, precision: number, page = 1): Promise<CTokenTopHolder[]> => {
    return cTokensApi.getTopHolders(nai, precision, page);
  };

  const getTokenByNAI = (nai: string): LegacyTokenBalance | undefined => {
    return balances.value.find(balance => balance.nai === nai);
  };

  const getTokenDefinitionByNAI = (nai: string): LegacyTokenDefinition | undefined => {
    return tokenDefinitions.value.find(token => token.nai === nai);
  };

  const refreshAll = async () => {
    await Promise.all([
      loadBalances(true),
      loadTokenDefinitions(undefined, true)
    ]);
  };

  const clearError = () => {
    lastError.value = null;
  };

  return {
    // State
    balances,
    tokenDefinitions,
    isLoadingBalances,
    isLoadingTokens,
    lastError,

    // Computed
    totalValue,
    tokenCount,
    hasBalances,
    hasTokenDefinitions,

    // Actions
    loadBalances,
    loadTokenDefinitions,
    getBalanceHistory,
    getTopHolders,
    getTokenByNAI,
    getTokenDefinitionByNAI,
    refreshAll,
    clearError
  };
});
