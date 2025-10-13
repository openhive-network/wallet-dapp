import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import { getWax } from '@/stores/wax.store';
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

export interface CTokenDisplay {
  nai: string;
  isStaked: boolean;
  ownerPublicKey: string;
  precision: number;
  displayTotalSupply: string;
  totalSupply: bigint;
  maxSupply: bigint;
  displayMaxSupply: string;
  capped: boolean;
  othersCanStake: boolean;
  othersCanUnstake: boolean;
  isNft: boolean;
  metadata?: Record<string, unknown>;
  // Parsed from the metadata
  name?: string;
  description?: string;
  website?: string;
  image?: string;
}

const cTokensProvider = shallowRef<CTokensProvider | undefined>(undefined);

// Helper functions for token transformation
const isVesting = (nai: string, precision: number): boolean =>
  (((Number(nai.slice(2, -1)) << 5) | 0x10 | precision) & 0x20) !== 0;

const formatAsset = async (value: string | bigint, precision: number, name?: string): Promise<string> => {
  const wax = await getWax();
  const formatted = wax.formatter.formatNumber(value, precision);
  return name ? `${formatted} ${name}` : formatted;
};

const transformTokenToDisplayFormat = async (token: Required<CtokensAppToken>): Promise<CTokenDisplay> => {
  const { name, description, website, image } = (token.metadata || {}) as Record<string, string>;

  return {
    nai: token.nai,
    isStaked: isVesting(token.nai, token.precision),
    displayMaxSupply: await formatAsset(token.max_supply, token.precision, name),
    ownerPublicKey: token.owner,
    precision: token.precision,
    displayTotalSupply: await formatAsset(token.total_supply, token.precision, name),
    totalSupply: BigInt(token.total_supply),
    maxSupply: BigInt(token.max_supply),
    capped: token.capped,
    othersCanStake: token.others_can_stake,
    othersCanUnstake: token.others_can_unstake,
    isNft: token.is_nft,
    metadata: token.metadata as Record<string, unknown>,
    name,
    description,
    website,
    image
  };
};

export const useTokensStore = defineStore('tokens', {
  state: () => ({
    balances: [] as CtokensAppArrayOfBalances,
    tokenDefinitions: [] as CtokensAppArrayOfTokens,
    registeredTokens: [] as CTokenDisplay[],
    isLoadingBalances: false,
    isLoadingTokens: false,
    isLoadingRegisteredTokens: false,
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
    hasTokenDefinitions: (state) => state.tokenDefinitions.length > 0,
    hasRegisteredTokens: (state) => state.registeredTokens.length > 0,
    // Filtered getters for registered tokens
    filteredTokens: (state) => (nai?: string, precision?: number) => {
      let filtered = state.registeredTokens;

      if (nai)
        filtered = filtered.filter((token: CTokenDisplay) => token.nai === nai);

      if (precision !== undefined)
        filtered = filtered.filter((token: CTokenDisplay) => token.precision === precision);

      return filtered;
    },
    stakedTokens: (state) => state.registeredTokens.filter((token: CTokenDisplay) => token.isStaked),
    unstakedTokens: (state) => state.registeredTokens.filter((token: CTokenDisplay) => !token.isStaked),
    nftTokens: (state) => state.registeredTokens.filter((token: CTokenDisplay) => token.isNft),
    fungibleTokens: (state) => state.registeredTokens.filter((token: CTokenDisplay) => !token.isNft)
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
    /**
     * Load registered tokens with pre-formatted display data
     */
    async loadRegisteredTokens (nai?: string, precision?: number, page = 1, forceRefresh = false) {
      if (this.isLoadingRegisteredTokens && !forceRefresh) return;

      this.isLoadingRegisteredTokens = true;
      this.lastError = null;

      try {
        const cTokensApi = await getCTokensApi();

        // Get raw tokens from API
        const tokens = await cTokensApi.getRegisteredTokens(nai, precision) as Required<CtokensAppToken>[];

        console.log(tokens);

        // Transform tokens to display format
        const transformedTokens = await Promise.all(
          tokens.map(token => transformTokenToDisplayFormat(token))
        );

        // For pagination, we append or replace based on page
        if (page === 1)
          this.registeredTokens = transformedTokens;
        else
          this.registeredTokens.push(...transformedTokens);

        return {
          tokens: transformedTokens,
          hasMore: tokens.length === 100 // API returns 100 results per page
        };
      } catch (error) {
        console.error('Failed to load registered tokens:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load registered tokens';
        throw error;
      } finally {
        this.isLoadingRegisteredTokens = false;
      }
    },
    /**
     * Get filtered registered tokens list
     */
    getFilteredRegisteredTokens (nai?: string, precision?: number): CTokenDisplay[] {
      return this.filteredTokens(nai, precision);
    },
    /**
     * Get single registered token by NAI and precision
     */
    getRegisteredTokenByNAI (nai: string, precision?: number): CTokenDisplay | undefined {
      return this.registeredTokens.find((token: CTokenDisplay) =>
        token.nai === nai && (precision === undefined || token.precision === precision)
      );
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
        this.loadTokenDefinitions(undefined, true),
        this.loadRegisteredTokens(undefined, undefined, 1, true)
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
