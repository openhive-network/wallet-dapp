import type { NaiAsset, TWaxRestExtended, TWaxExtended, asset } from '@hiveio/wax';

import CTokensApi from '@/utils/wallet/ctokens/api';

export interface WaxApi {
  database_api: {
    get_current_price_feed: {
      params: {};
      result: {
        base: NaiAsset;
        quote: NaiAsset;
      };
    };
    get_witness_schedule: {
      params: {};
      result: {
        median_props: {
          account_creation_fee: asset;
        };
      };
    };
    get_hardfork_properties: {
      params: {};
      result: {
        last_hardfork: number;
      };
    };
  };
  bridge: {
    get_profile: {
      params: { account: string };
      result: {
        id: number;
        name: string;
        created: string;
        active: string;
        post_count: number;
        reputation: number;
        blacklists: [];
        stats: {rank: number; following: number; followers: number;};
        metadata: {
          profile: {
            name?: string;
            about?: string;
            website?: string;
            location?: string;
            cover_image?: string;
            profile_image?: string;
            blacklist_description?: string;
            muted_list_description?: string;
          }
        },
        context: {followed: boolean;}
      };
    };
    // NAI Token operations
    create_nai_token: {
      params: {
        creator: string;
        symbol: string;
        name: string;
        description: string;
        nai: string;
        initial_supply: string;
        precision: number;
        can_stake: boolean;
      };
      result: {
        success: boolean;
        nai: string;
        transaction_id: string;
      };
    };
    get_nai_tokens: {
      params: { creator?: string; limit?: number; start?: string };
      result: {
        tokens: Array<{
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
        }>;
      };
    };
    get_account_balances: {
      params: { account: string };
      result: {
        balances: Array<{
          symbol: string;
          name: string;
          nai: string;
          liquid_balance: string;
          staked_balance: string;
          precision: number;
          can_stake: boolean;
        }>;
      };
    };
    transfer_nai_token: {
      params: {
        from: string;
        to: string;
        amount: string;
        symbol: string;
        memo?: string;
      };
      result: {
        success: boolean;
        transaction_id: string;
      };
    };
    stake_nai_token: {
      params: {
        account: string;
        amount: string;
        symbol: string;
        direction: 'stake' | 'unstake';
      };
      result: {
        success: boolean;
        transaction_id: string;
      };
    };
    user_signup: {
      params: {
        account: string;
        email?: string;
        referrer?: string;
      };
      result: {
        success: boolean;
        account_exists: boolean;
        message: string;
      };
    };
  };
};

let chain: TWaxRestExtended<typeof CTokensApi, TWaxExtended<WaxApi>>;

export const getWax = async () => {
  if (!chain) {
    const { public: { hiveNodeEndpoint, hiveChainId, ctokensApiUrl } } = useRuntimeConfig();

    const chainId = typeof hiveChainId === 'number' || hiveChainId.length > 0 ? String(hiveChainId) : undefined;
    const apiEndpoint = hiveNodeEndpoint.length > 0 ? hiveNodeEndpoint : undefined;

    chain = (await (await import('@hiveio/wax')).createHiveChain({ apiEndpoint, chainId })).extend<WaxApi>().extendRest(CTokensApi);

    // These steps are repeated in the CtokensProvider constructor, but we need them here too as for now - maybe find a better way of handling this?
    chain.restApi.ctokensApi.endpointUrl = ctokensApiUrl || 'http://192.168.6.7';
  }

  return chain;
};
