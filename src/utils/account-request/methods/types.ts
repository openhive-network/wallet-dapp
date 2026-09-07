import type { AccountPublicKeys, AccountRegistrationMethod, AccountRequestClaimResponse } from '#shared/types/account-request';

import type { AccountAuthorityData } from '../keys';

export interface PreparedAccountKeys {
  publicKeys: AccountPublicKeys;
  /** Private key material - present only when keys were generated locally (password / Google Drive) */
  authorityData?: AccountAuthorityData;
}

/**
 * Registration method strategy - encapsulates where the new account keys come from
 * and what happens with them once the account exists on chain.
 */
export interface AccountRegistrationStrategy {
  readonly method: AccountRegistrationMethod;
  /** Progress message shown while `prepare` runs */
  readonly preparingMessage: string;
  /** Produces (and safely stores, if applicable) the keys for the new account */
  prepare (accountName: string): Promise<PreparedAccountKeys>;
  /** Called after the account was created - e.g. logs the user in with the matching wallet */
  onCreated? (accountName: string, result: AccountRequestClaimResponse, keys: PreparedAccountKeys): Promise<void>;
  /** Called when the creation request failed - reverts side effects of `prepare` */
  onFailed? (accountName: string, keys: PreparedAccountKeys): Promise<void>;
}
