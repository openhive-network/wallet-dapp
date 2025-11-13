import type { IWaxBaseInterface } from '@hiveio/wax';
import { HtmTransaction } from '@mtyszczak-cargo/htm';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import { getWax } from '@/stores/wax.store';
import { isVesting } from '@/utils/nai-tokens';
import type {
  CtokensAppBalance,
  CtokensAppToken,
  CtokensAppTopHolder
} from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

import { useSettingsStore } from './settings.store';
import { transformUserName } from './user.store';
import { useWalletStore } from './wallet.store';

export interface CTokenDisplay {
  nai: string;
  assetNum: number;
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
  symbol?: string;
  description?: string;
  website?: string;
  image?: string;
}

const cTokensProvider = shallowRef<CTokensProvider | undefined>(undefined);

const formatAsset = (wax: IWaxBaseInterface, value: string | bigint, precision: number, name?: string): string => {
  const formatted = wax.formatter.formatNumber(value, precision);
  return name ? `${formatted} ${name}` : formatted;
};

export const transformTokenToDisplayFormat = (wax: IWaxBaseInterface, token: Required<CtokensAppToken>): CTokenDisplay => {
  const { name, symbol, description, website, image } = (token.metadata || {}) as Record<string, string>;

  return {
    nai: token.nai,
    assetNum: Number(token.asset_num),
    isStaked: isVesting(token.nai, token.precision),
    displayMaxSupply: formatAsset(wax, token.max_supply, token.precision, symbol || name),
    ownerPublicKey: token.owner,
    precision: token.precision,
    displayTotalSupply: formatAsset(wax, token.total_supply, token.precision, symbol || name),
    totalSupply: BigInt(token.total_supply),
    maxSupply: BigInt(token.max_supply),
    capped: token.capped,
    othersCanStake: token.others_can_stake,
    othersCanUnstake: token.others_can_unstake,
    isNft: token.is_nft,
    metadata: token.metadata as Record<string, unknown>,
    name,
    symbol,
    description,
    website,
    image
  };
};

export const useTokensStore = defineStore('tokens', {
  state: () => ({
    balances: [] as CtokensAppBalance[],
    tokenDefinitions: [] as CtokensAppBalance[],
    registeredTokens: [] as CTokenDisplay[],
    isLoadingBalances: false,
    isLoadingTokens: false,
    isLoadingRegisteredTokens: false,
    lastError: null as string | null,
    ignoreLogIn: false
  }),
  getters: {
    wallet: () => cTokensProvider.value,
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
      const operationalKey = CTokensProvider.getOperationalPublicKey();

      if (!operationalKey) {
        this.lastError = 'No operational key available';
        return;
      }

      if (this.isLoadingBalances && !forceRefresh) return;

      this.isLoadingBalances = true;
      this.lastError = null;

      try {
        const wax = await getWax();

        // TODO: Implement NFT filtering

        // Get balances from ctokens-api
        const cTokenBalances = await wax.restApi.ctokensApi.balances({ user: operationalKey, page: 1 });

        // Filter out null values when flattening
        this.balances = cTokenBalances.items!.flatMap(balance => {
          const result: CtokensAppBalance[] = [];
          if (balance.liquid) result.push(balance.liquid);
          if (balance.vesting) result.push(balance.vesting);
          return result;
        });
      } catch (error) {
        console.error('Failed to load balances:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load balances';
        this.balances = [];
      } finally {
        this.isLoadingBalances = false;
      }
    },
    async loadTokenDefinitions (creator?: string, forceRefresh = false) {
      if (this.isLoadingTokens && !forceRefresh) return;

      this.isLoadingTokens = true;
      this.lastError = null;

      try {
        const wax = await getWax();

        // Get registered tokens from ctokens-api
        const tokens = await wax.restApi.ctokensApi.tokens({ owner: creator });

        // Filter by creator if provided
        this.tokenDefinitions = tokens.items!.flatMap(token => {
          const result: CtokensAppBalance[] = [];
          if (token.liquid) result.push(token.liquid);
          if (token.vesting) result.push(token.vesting);
          return result;
        });
      } catch (error) {
        console.error('Failed to load token definitions:', error);
        this.lastError = error instanceof Error ? error.message : 'Failed to load token definitions';
        this.tokenDefinitions = [];
      } finally {
        this.isLoadingTokens = false;
      }
    },
    async getCurrentUserMetadata () {
      const wax = await getWax();

      if (this.wallet?.publicKey === undefined)
        throw new Error('Could not load CTokens wallet');

      const user = await wax.restApi.ctokensApi.users({ user: this.wallet.publicKey });

      if (!user?.management_key)
        throw new Error('CTokens user not found');

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const metadata = user.metadata as Record<string, any>;

      return {
        displayName: metadata?.name || transformUserName(this.wallet.publicKey),
        about: metadata?.about,
        name: metadata?.name,
        profileImage: metadata?.profile_image,
        website: metadata?.website
      };
    },
    /**
     * Load registered tokens with pre-formatted display data
     */
    async loadRegisteredTokens (assetNum?: string | number, page = 1, forceRefresh = false) {
      if (this.isLoadingRegisteredTokens && !forceRefresh) return;

      this.isLoadingRegisteredTokens = true;
      this.lastError = null;

      try {
        const wax = await getWax();
        // Get raw tokens from API
        const tokens = await wax.restApi.ctokensApi.tokens(assetNum ? { 'asset-num': Number(assetNum) } : {});

        // Transform tokens to display format
        const transformedTokens = tokens.items!.flatMap(token => ([
          transformTokenToDisplayFormat(wax, token.liquid as Required<CtokensAppToken>),
          transformTokenToDisplayFormat(wax, token.vesting as Required<CtokensAppToken>)
        ]));

        // For pagination, we append or replace based on page
        if (page === 1)
          this.registeredTokens = transformedTokens;
        else
          this.registeredTokens.push(...transformedTokens);

        // TODO: Implement proper pagination handling

        return {
          tokens: transformedTokens,
          hasMore: tokens.items!.length === 100 // API returns 100 results per page
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
    async getTopHolders (assetNum: number | string, page = 1): Promise<CtokensAppTopHolder[]> {
      const wax = await getWax();
      const response = await wax.restApi.ctokensApi.topHolders({ 'asset-num': Number(assetNum), page });

      return response.items || [];
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
        this.loadRegisteredTokens(undefined, 1, true)
      ]);
    },
    clearError () {
      this.lastError = null;
    },
    async updateTokenMetadata (
      nai: string,
      precision: number,
      metadata: Record<string, string>
    ): Promise<string> {
      const operationalKey = CTokensProvider.getOperationalPublicKey();
      if (!operationalKey)
        throw new Error('No operational key available');

      // Get operational account from settings
      const settingsStore = useSettingsStore();
      const operationalAccount = settingsStore.settings.account;

      if (!operationalAccount)
        throw new Error('No operational account configured');

      // Get L1 wallet for signing the transaction
      const walletStore = useWalletStore();
      await walletStore.createWalletFor(settingsStore.settings, 'posting');

      if (!walletStore.wallet)
        throw new Error('No L1 wallet available');

      const wax = await getWax();

      // Create CTokensProvider instance for L2 signing (owner role for metadata updates)
      const l2Wallet = await CTokensProvider.for(wax, 'owner');

      // Convert metadata object to array of key-value pairs
      const metadataItems = Object.entries(metadata).map(([key, value]) => ({
        key,
        value
      }));

      // Set proxy account for HTM transactions
      HtmTransaction.HiveProxyAccount = operationalAccount;

      // Create L2 HTM transaction for asset metadata update
      const l2Transaction = new HtmTransaction(wax);
      l2Transaction.pushOperation({
        asset_metadata_update_operation: {
          owner: operationalKey,
          identifier: {
            amount: '0',
            nai,
            precision
          },
          metadata: {
            items: metadataItems
          }
        }
      });

      // Sign L2 transaction with management wallet (owner role)
      await l2Wallet.signTransaction(l2Transaction);

      // Create L1 transaction to broadcast the HTM transaction
      const l1Transaction = await wax.createTransaction();
      l1Transaction.pushOperation(l2Transaction);

      // Sign L1 transaction with active wallet
      await walletStore.wallet.signTransaction(l1Transaction);

      // Broadcast the transaction
      await wax.broadcast(l1Transaction);

      return l1Transaction.legacy_id;
    },
    async reset (cTokensWallet?: CTokensProvider | undefined) {
      // Cleanup only if we don't want to use any other L2 wallet
      if (cTokensWallet === undefined)
        await cTokensProvider.value?.destroy();
      cTokensProvider.value = cTokensWallet;
    }
  }
});
