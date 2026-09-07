import { normalizeAccountName } from '#shared/utils/account-name';

import { resolveAccountRequestDatabaseUrl } from './database-url';

export interface AccountCreatorConfig {
  /** Hive account paying for / signing the account creation */
  account: string;
  /** Active private key (WIF) of the creator account - signs transactions and encrypts the request tokens */
  activeKey: string;
  /** Use `create_claimed_account_operation` instead of paying the creation fee */
  useClaimedAccounts: boolean;
}

export interface AccountRequestConfig {
  creator: AccountCreatorConfig;
  /** QR code refresh interval in seconds - a fresh token is issued for every refresh */
  tokenInterval: number;
  /** Prisma datasource URL of the SQLite database storing claimed tokens */
  databaseUrl: string;
}

const toTrimmedString = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/**
 * Configuration of the optional QR onboarding module.
 * Returns `undefined` (module disabled) unless the creator account and its active private key are configured.
 */
export const getAccountRequestConfig = (): AccountRequestConfig | undefined => {
  const config = useRuntimeConfig();

  const account = normalizeAccountName(toTrimmedString(config.accountCreatorAccount));
  const activeKey = toTrimmedString(config.accountCreatorActiveKey);

  if (!account || !activeKey)
    return undefined;

  const tokenInterval = Number(config.accountRequestTokenInterval);

  if (!Number.isFinite(tokenInterval) || tokenInterval <= 0)
    throw new Error(`NUXT_ACCOUNT_REQUEST_TOKEN_INTERVAL must be a positive number of seconds, got: ${String(config.accountRequestTokenInterval)}`);

  return {
    creator: {
      account,
      activeKey,
      useClaimedAccounts: config.accountCreatorUseClaimedAccounts === true
    },
    tokenInterval,
    databaseUrl: resolveAccountRequestDatabaseUrl(toTrimmedString(config.accountRequestDatabaseUrl))
  };
};

export const requireAccountRequestConfig = (): AccountRequestConfig => {
  const config = getAccountRequestConfig();

  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Account onboarding via QR code is not configured (missing NUXT_ACCOUNT_CREATOR_ACCOUNT or NUXT_ACCOUNT_CREATOR_ACTIVE_KEY)'
    });
  }

  return config;
};
