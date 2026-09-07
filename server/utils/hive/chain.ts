import { createHiveChain, DEFAULT_WAX_OPTIONS, type asset, type TWaxExtended } from '@hiveio/wax';

import { resolveHiveChainOptions } from '#shared/utils/hive-chain-options';

export interface ServerWaxApi {
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
}

export type ServerWax = TWaxExtended<ServerWaxApi>;

let chainPromise: Promise<ServerWax> | undefined;

/** Server-side wax instance shared between requests */
export const getServerWax = (): Promise<ServerWax> => {
  if (!chainPromise) {
    const { public: { hiveNodeEndpoint, hiveChainId } } = useRuntimeConfig();

    chainPromise = createHiveChain(resolveHiveChainOptions({ hiveNodeEndpoint, hiveChainId }, DEFAULT_WAX_OPTIONS.chainId))
      .then(chain => chain.extend<ServerWaxApi>())
      .catch((error: unknown) => {
        chainPromise = undefined;
        throw error;
      });
  }

  return chainPromise;
};

const ACCOUNT_CREATION_FEE_TTL_MS = 60_000;

let accountCreationFee: { promise: Promise<asset>; expiresAt: number } | undefined;

/** Median account creation fee from the witness schedule, cached for a minute and shared between concurrent requests */
export const getAccountCreationFee = (): Promise<asset> => {
  if (!accountCreationFee || accountCreationFee.expiresAt <= Date.now()) {
    const promise = getServerWax()
      .then(wax => wax.api.database_api.get_witness_schedule({}))
      .then(schedule => schedule.median_props.account_creation_fee)
      .catch((error: unknown) => {
        if (accountCreationFee?.promise === promise)
          accountCreationFee = undefined;
        throw error;
      });

    accountCreationFee = { promise, expiresAt: Date.now() + ACCOUNT_CREATION_FEE_TTL_MS };
  }

  return accountCreationFee.promise;
};
