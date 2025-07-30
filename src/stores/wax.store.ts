import type { TWaxExtended, asset } from '@hiveio/wax/vite';

export interface WaxApi {
  database_api: {
    get_witness_schedule: {
      params: {};
      result: {
        median_props: {
          account_creation_fee: asset;
        };
      };
    };
  };
};

let chain: TWaxExtended<WaxApi>;

export const getWax = async () => {
  if (!chain)
    chain = (await (await import('@hiveio/wax/vite')).createHiveChain()).extend<WaxApi>();

  return chain;
};
