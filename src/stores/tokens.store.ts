import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

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
import type CTokensProvider from '@/utils/wallet/ctokens/signer';

const cTokensProvider = shallowRef<CTokensProvider | undefined>(undefined);

export const useTokensStore = defineStore('tokens', {
  state: () => ({
    balances: [] as LegacyTokenBalance[],
    tokenDefinitions: [] as LegacyTokenDefinition[],
    isLoadingBalances: false,
    isLoadingTokens: false,
    lastError: null as string | null
  }),
  getters: {
    wallet: () => cTokensProvider.value,
    totalValue: (state) => {
      return state.balances.reduce((total, balance) => {
        // Mock price of $0.01 per token for now
        const price = 0.01;
        const amount = parseFloat(balance.total_balance);
        return total + (amount * price);
      }, 0);
    },
    tokenCount: (state) => state.balances.length,
    hasBalances: (state) => state.balances.length > 0,
    hasTokenDefinitions: (state) => state.tokenDefinitions.length > 0
  },
  actions: {
    async loadBalances (forceRefresh = false) {
      const operationalKey = getUserOperationalKey();

      if (!operationalKey) {
        this.lastError = 'No operational key available';
        return;
      }

      if (this.isLoadingBalances && !forceRefresh) return;

      this.isLoadingBalances = true;
      this.lastError = null;

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

        this.balances = legacyBalances;
      } catch (error) {
        console.error('Failed to load balances:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load balances';

        // Fallback to mock data for development
        console.log('Using fallback mock data for development');
        this.balances = [
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
        this.isLoadingBalances = false;
      }
    },
    async loadTokenDefinitions (creator?: string, forceRefresh = false) {
      if (this.isLoadingTokens && !forceRefresh) return;

      this.isLoadingTokens = true;
      this.lastError = null;

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
        this.tokenDefinitions = filteredTokens.map(token => transformCTokenToLegacy(token));
      } catch (error) {
        console.error('Failed to load token definitions:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load token definitions';

        // Fallback to mock data for development
        console.log('Using fallback mock data for token definitions');
        this.tokenDefinitions = [
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
        this.isLoadingTokens = false;
      }
    },
    async getBalanceHistory (nai: string, precision: number, page = 1): Promise<CTokenBalanceHistory[]> {
      const operationalKey = getUserOperationalKey();
      if (!operationalKey)
        throw new Error('No operational key available');

      return cTokensApi.getBalanceHistory(operationalKey, nai, precision, page);
    },
    async getTopHolders (nai: string, precision: number, page = 1): Promise<CTokenTopHolder[]> {
      return cTokensApi.getTopHolders(nai, precision, page);
    },
    getTokenByNAI (nai: string): LegacyTokenBalance | undefined {
      return this.balances.find(balance => balance.nai === nai);
    },
    getTokenDefinitionByNAI (nai: string): LegacyTokenDefinition | undefined {
      return this.tokenDefinitions.find(token => token.nai === nai);
    },
    async refreshAll () {
      await Promise.all([
        this.loadBalances(true),
        this.loadTokenDefinitions(undefined, true)
      ]);
    },
    clearError () {
      this.lastError = null;
    },
    reset (cTokensWallet?: CTokensProvider | undefined) {
      cTokensProvider.value = cTokensWallet;
    }
  }
});
