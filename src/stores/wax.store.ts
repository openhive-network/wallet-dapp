import type { NaiAsset, TWaxExtended, asset } from '@hiveio/wax/vite';

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
    }
  }
};

let chain: TWaxExtended<WaxApi>;

export const getWax = async () => {
  if (!chain)
    chain = (await (await import('@hiveio/wax/vite')).createHiveChain()).extend<WaxApi>();

  return chain;
};
