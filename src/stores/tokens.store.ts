import type { IWaxBaseInterface } from '@hiveio/wax';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import { transformUserName } from '@/stores/user.store';
import { getWax } from '@/stores/wax.store';
import { isVesting } from '@/utils/nai-tokens';
import { CtokensAppMetadataType, type CtokensAppAssetType, type CtokensAppBalance, type CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

export interface CTokenDisplayBase {
  isNft: boolean;
  nai: string;
  assetNum: number;
  isStaked: boolean;
  precision: number;
  metadata: Record<string, unknown>;
  // Parsed from the metadata
  name?: string;
  symbol?: string;
  description?: string;
  website?: string;
  image?: string;
}

export interface CTokenUser {
  operationalKey: string;
  metadata: Record<string, unknown>;
  displayName: string;
  about: string;
  name: string;
  profileImage: string;
  website: string;
}

export interface CTokenUserRanked extends CTokenUser {
  rank: number;
  amount: bigint;
  displayAmount: string;
}

export interface CTokenBalanceDisplay extends CTokenDisplayBase {
  balance: bigint;
  displayBalance: string;
}

export interface CTokenDefinitionDisplay extends CTokenDisplayBase {
  ownerPublicKey: string;
  displayTotalSupply: string;
  totalSupply: bigint;
  maxSupply: bigint;
  displayMaxSupply: string;
  capped: boolean;
  othersCanStake: boolean;
  othersCanUnstake: boolean;
}

export interface CTokenPairBalanceDefinition {
  liquid: CTokenBalanceDisplay;
  vesting: CTokenBalanceDisplay;
  total: bigint;
  displayTotal: string;
  isNft: boolean;
}

export interface CTokenPairDefinition {
  liquid: CTokenDefinitionDisplay;
  vesting: CTokenDefinitionDisplay;
  isNft: boolean;
}

export interface TokenStoreApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

const transformUserToDisplayFormat = <T extends {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  metadata?: Record<string, any>;
  user?: string;
  operational_key?: string;
}>(userData: T): CTokenUser => {
  const { metadata } = userData;

  const operationalKey = userData.user || String(userData.operational_key);

  return {
    operationalKey,
    metadata: metadata || {},
    displayName: String(metadata?.name) || transformUserName(operationalKey),
    about: metadata?.about as string,
    name: metadata?.name as string,
    profileImage: metadata?.profile_image as string,
    website: metadata?.website as string
  };
};

const transformToApiResponseFormat = <ActualDataResponse, T extends {
  total_items?: number;
  total_pages?: number;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  items?: any[];
}>(transformedArrayItems: ActualDataResponse[], originalApiResponse: T, page: number): TokenStoreApiResponse<ActualDataResponse> => ({
    items: transformedArrayItems,
    total: originalApiResponse.total_items || 0,
    page,
    pages: originalApiResponse.total_pages || 1,
    hasMore: page < (originalApiResponse.total_pages || 0)
  });

const cTokensProvider = shallowRef<CTokensProvider | undefined>(undefined);

export const formatAsset = (wax: IWaxBaseInterface, value: string | bigint, precision: number, name?: string): string => {
  const integer = String(value).slice(0, -precision) || '0';
  const fraction = String(value).slice(-precision).padEnd(precision, '0');

  const formatted = wax.formatter.formatNumber(integer, 0);
  const numOut = `${formatted}.${fraction}`;
  return name ? `${numOut} ${name}` : numOut;
};

export const transformTokenToDisplayFormat = (wax: IWaxBaseInterface, token: Required<CtokensAppToken>, isNft: boolean): CTokenDefinitionDisplay => {
  const { name, symbol, description, website, image } = (token.metadata || {}) as Record<string, string>;

  return {
    isNft,
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
    metadata: token.metadata as Record<string, unknown>,
    name,
    symbol,
    description,
    website,
    image
  };
};

export const transformTokenBalanceToDisplayFormat = (wax: IWaxBaseInterface, token: Required<CtokensAppBalance>, isNft: boolean): CTokenBalanceDisplay => {
  const { name, symbol, description, website, image } = (token.metadata || {}) as Record<string, string>;

  return {
    isNft,
    nai: token.nai,
    assetNum: Number(token.asset_num),
    isStaked: isVesting(token.nai, token.precision),
    precision: token.precision,
    displayBalance: formatAsset(wax, token.amount, token.precision, symbol || name),
    balance: BigInt(token.amount),
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
    fungibleBalances: [] as CTokenPairBalanceDefinition[],
    fungibleTokenDefinitions: [] as CTokenPairDefinition[],
    fungibleTokensCreatedByUser: [] as CTokenPairDefinition[],
    /* Helper flag to indicate if any API call is in progress */
    isLoading: false,
    ignoreLogIn: false
  }),
  getters: {
    wallet: () => cTokensProvider.value
  },
  actions: {
    async getBalance (user: string, assetNum: number | undefined, page = 1, assetType: CtokensAppAssetType = 'token' as CtokensAppAssetType): Promise<TokenStoreApiResponse<CTokenPairBalanceDefinition>> {
      this.isLoading = true;

      try {
        const wax = await getWax();

        const cTokenBalances = await wax.restApi.ctokensApi.balances({ user, 'asset-num': assetNum, page, 'asset-type': assetType });

        // Filter out null values when flattening
        const balancesNormalized = cTokenBalances.items!.map(token => {
          const liquid = transformTokenBalanceToDisplayFormat(wax, token.liquid as Required<CtokensAppBalance>, token.is_nft!);
          const vesting = transformTokenBalanceToDisplayFormat(wax, token.vesting as Required<CtokensAppBalance>, token.is_nft!);

          const total = liquid.balance + vesting.balance;
          const displayTotal = formatAsset(wax, total, liquid.precision, liquid.symbol || liquid.name);

          return {
            liquid,
            vesting,
            total,
            displayTotal,
            isNft: token.is_nft!
          };
        });

        return transformToApiResponseFormat(balancesNormalized, cTokenBalances, page);
      } finally {
        this.isLoading = false;
      }
    },
    async getBalanceSingleToken (user: string, assetNum: number): Promise<CTokenBalanceDisplay> {
      const balanceObj = await this.getBalance(user, assetNum);
      const itemRequested = balanceObj.items[0]?.liquid.assetNum === assetNum
        ? balanceObj.items[0]!.liquid
        : balanceObj.items[0]?.vesting.assetNum === assetNum
          ? balanceObj.items[0]!.vesting
          : null;

      if (!itemRequested)
        throw new Error(`Balance for asset number ${assetNum} not found`);

      return itemRequested;
    },
    getUserPublicKey (): string | undefined {
      return CTokensProvider.getOperationalPublicKey();
    },
    async loadBalances (page = 1): Promise<TokenStoreApiResponse<CTokenPairBalanceDefinition>> {
      const operationalKey = this.getUserPublicKey();

      if (!operationalKey)
        throw new Error('CTokens operational key not found - failed to load balances');

      const balances = await this.getBalance(operationalKey, undefined, page);

      this.fungibleBalances = balances.items;

      return balances;
    },
    async loadTokens (page = 1, owner?: string): Promise<TokenStoreApiResponse<CTokenPairDefinition>> {
      this.isLoading = true;

      try {
        const wax = await getWax();

        const cTokensCreated = await wax.restApi.ctokensApi.tokens({ page, 'asset-type': 'token' as CtokensAppAssetType, owner });

        const definitions = cTokensCreated.items!.map(token => {
          const liquid = transformTokenToDisplayFormat(wax, token.liquid as Required<CtokensAppToken>, false);
          const vesting = transformTokenToDisplayFormat(wax, token.vesting as Required<CtokensAppToken>, false);

          return {
            liquid,
            vesting,
            isNft: false
          };
        });

        if (owner) // XXX: Maybe do not rely on owner param here to assign local values (Single resposibility principle)
          this.fungibleTokensCreatedByUser = definitions;
        else
          this.fungibleTokenDefinitions = definitions;

        return transformToApiResponseFormat(definitions, cTokensCreated, page);
      } finally {
        this.isLoading = false;
      }
    },
    async searchTokens (nameOrAssetSymbolOrSymbol: string, page = 1, owner: string | undefined): Promise<TokenStoreApiResponse<Partial<CTokenPairDefinition>>> {
      this.isLoading = true;

      // This entire function should be replaced in future with a proper search API endpoint once available

      try {
        const wax = await getWax();

        const isAssetSymbol = Number.parseInt(nameOrAssetSymbolOrSymbol, 10).toString() === nameOrAssetSymbolOrSymbol;
        if (isAssetSymbol) {
          const assetData = await this.getTokenByAssetNum(Number(nameOrAssetSymbolOrSymbol));
          if (owner && assetData.ownerPublicKey !== owner)
          {return {
            hasMore: false,
            page: 1,
            pages: 1,
            total: 0,
            items: []
          };}

          const liquid = assetData.isStaked ? undefined : assetData;
          const vesting = assetData.isStaked ? assetData : undefined;

          return {
            hasMore: false,
            page: 1,
            pages: 1,
            total: 1,
            items: [{
              isNft: false,
              liquid,
              vesting
            }]
          };
        }

        const searchArray = [
          wax.restApi.ctokensApi.metadata.metadataType({
            metadataType: CtokensAppMetadataType.Token,
            key: 'symbol',
            value: nameOrAssetSymbolOrSymbol,
            owner,
            page
          }),
          wax.restApi.ctokensApi.metadata.metadataType({
            metadataType: CtokensAppMetadataType.Token,
            key: 'name',
            value: nameOrAssetSymbolOrSymbol,
            owner,
            page
          })
        ];

        const cTokensFound = await Promise.allSettled(searchArray);

        const tokensRaw = new Map<number, CTokenDefinitionDisplay>();

        let maxPages = 0, totalItems = 0;

        for (const result of cTokensFound) {
          if (result.status === 'fulfilled') {
            for(const item of (result.value.items || []) as CtokensAppToken[])
              tokensRaw.set(item.asset_num!, transformTokenToDisplayFormat(wax, item as Required<CtokensAppToken>, false));

            maxPages = Math.max(maxPages, result.value.total_pages || 0);
            totalItems += result.value.total_items || 0;
          }
        }

        const tokensData: Array<Partial<CTokenPairDefinition>> = [];

        for(const [, token] of tokensRaw) {
          const liquid = token.isStaked ? undefined : token;
          const vesting = token.isStaked ? token : undefined;

          tokensData.push({
            liquid,
            vesting,
            isNft: false
          });
        }

        return transformToApiResponseFormat(tokensData, {
          items: tokensData,
          total_items: totalItems,
          total_pages: maxPages
        }, page);
      } finally {
        this.isLoading = false;
      }
    },
    async getTokenByAssetNum (assetNum: number, page = 1): Promise<CTokenDefinitionDisplay> {
      this.isLoading = true;

      try {
        const wax = await getWax();

        const cToken = await wax.restApi.ctokensApi.tokens({ 'asset-num': assetNum, page, 'asset-type': 'token' as CtokensAppAssetType });

        const itemRequested = cToken.items?.[0]?.liquid?.asset_num === assetNum
          ? cToken.items[0]!.liquid!
          : cToken.items?.[0]?.vesting?.asset_num === assetNum
            ? cToken.items[0]!.vesting!
            : null;

        if (!itemRequested)
          throw new Error(`Definition for asset number ${assetNum} not found`);

        return transformTokenToDisplayFormat(wax, itemRequested as Required<CtokensAppToken>, false);
      } finally {
        this.isLoading = false;
      }
    },
    async getCurrentUserMetadata (): Promise<CTokenUser> {
      const wax = await getWax();

      const operationalKey = this.getUserPublicKey();
      if (!operationalKey)
        throw new Error('Could not retrieve user metadata - CTokens wallet not connected');

      const user = await wax.restApi.ctokensApi.users({ user: operationalKey });

      if (!user?.management_key)
        throw new Error('CTokens user not found');

      return transformUserToDisplayFormat(user);
    },
    async getTopHolders (assetData: Pick<CTokenDefinitionDisplay, 'precision' | 'assetNum' | 'symbol' | 'name'>, page = 1): Promise<TokenStoreApiResponse<CTokenUserRanked>> {
      this.isLoading = true;

      try {
        const wax = await getWax();

        const cTokensTopHolders = await wax.restApi.ctokensApi.topHolders({ page, 'asset-num': assetData.assetNum });

        const topHolders = cTokensTopHolders.items!.map(holder => {
          const balance = BigInt(holder.amount || '0');
          const userData = transformUserToDisplayFormat(holder);
          const displayAmount = formatAsset(wax, balance, assetData.precision, assetData.symbol || assetData.name);

          return {
            ...userData,
            rank: Number(holder.rank || 0),
            amount: balance,
            displayAmount
          } satisfies CTokenUserRanked;
        });

        return transformToApiResponseFormat(topHolders, cTokensTopHolders, page);
      } finally {
        this.isLoading = false;
      }
    },
    async reset (cTokensWallet?: CTokensProvider | undefined) {
      // Cleanup only if we don't want to use any other L2 wallet
      if (cTokensWallet === undefined)
        await cTokensProvider.value?.destroy();
      cTokensProvider.value = cTokensWallet;
    }
  }
});
