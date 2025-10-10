import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import {
  getCTokensApi,
  getUserOperationalKey
} from '@/utils/ctokens-api';
import type {
  CtokensAppArrayOfBalances,
  CtokensAppArrayOfTokens,
  CtokensAppBalance,
  CtokensAppToken,
  CtokensAppBalanceHistory,
  CtokensAppTopHolder
} from '@/utils/wallet/ctokens/api';
import type CTokensProvider from '@/utils/wallet/ctokens/signer';

const cTokensProvider = shallowRef<CTokensProvider | undefined>(undefined);

export const useTokensStore = defineStore('tokens', {
  state: () => ({
    balances: [] as CtokensAppArrayOfBalances,
    tokenDefinitions: [] as CtokensAppArrayOfTokens,
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
        const amount = parseFloat(balance.amount!);
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
        const cTokensApi = await getCTokensApi();
        const isApiAvailable = await cTokensApi.testConnection();

        if (!isApiAvailable)
          throw new Error('ctokens-api is not available. Using fallback data.');

        // Get balances from ctokens-api
        const cTokenBalances = await cTokensApi.getAccountBalances(operationalKey);

        this.balances = cTokenBalances;
      } catch (error) {
        console.error('Failed to load balances:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load balances';

        // Fallback to mock data for development
        console.log('Using fallback mock data for development');
        this.balances = [
          {
            nai: '@@000000021',
            precision: 3,
            amount: '150.500'
          },
          {
            nai: '@@000000013',
            precision: 3,
            amount: '75.250'
          },
          {
            nai: '@@123456789',
            precision: 3,
            amount: '0.000'
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
        const cTokensApi = await getCTokensApi();
        const isApiAvailable = await cTokensApi.testConnection();

        if (!isApiAvailable)
          throw new Error('ctokens-api is not available. Using fallback data.');

        // Get registered tokens from ctokens-api
        const tokens = await cTokensApi.getRegisteredTokens();

        // Filter by creator if provided
        this.tokenDefinitions = creator ? tokens.filter((token: CtokensAppToken) => token.owner === creator) : tokens;
      } catch (error) {
        console.error('Failed to load token definitions:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load token definitions';

        // Fallback to mock data for development
        console.log('Using fallback mock data for token definitions');
        this.tokenDefinitions = [
          {
            nai: '@@123456789',
            owner: creator || 'testaccount',
            precision: 3,
            total_supply: '1000000',
            max_supply: '0',
            capped: false,
            others_can_stake: true,
            others_can_unstake: true,
            is_nft: false,
            metadata: {
              symbol: 'MAT',
              name: 'My Awesome Token',
              description: 'A test token for demonstration purposes',
              initial_supply: '1000000',
              created_at: '2024-01-15T10:30:00Z',
              active: true
            }
          }
        ];
      } finally {
        this.isLoadingTokens = false;
      }
    },
    async getBalanceHistory (nai: string, precision: number, page = 1): Promise<CtokensAppBalanceHistory[]> {
      const operationalKey = getUserOperationalKey();
      if (!operationalKey)
        throw new Error('No operational key available');

      const cTokensApi = await getCTokensApi();
      return cTokensApi.getBalanceHistory(operationalKey, nai, precision, page);
    },
    async getTopHolders (nai: string, precision: number, page = 1): Promise<CtokensAppTopHolder[]> {
      const cTokensApi = await getCTokensApi();
      return cTokensApi.getTopHolders(nai, precision, page);
    },
    getTokenByNAI (nai: string): CtokensAppBalance | undefined {
      return this.balances.find(balance => balance.nai === nai);
    },
    getTokenDefinitionByNAI (nai: string): CtokensAppToken | undefined {
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
