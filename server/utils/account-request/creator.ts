import type { operation } from '@hiveio/wax';
import beekeeperProviderFactory from '@hiveio/wax-signers-beekeeper';

import type { AccountPublicKeys } from '#shared/types/account-request';

import { getAccountCreationFee, getServerWax } from '../hive/chain';

import { requireAccountRequestConfig, type AccountCreatorConfig } from './config';
import { getCreatorWallet, withCreatorWallet } from './creator-wallet';

export interface AccountCreationRequest {
  accountName: string;
  publicKeys: AccountPublicKeys;
}

export interface AccountCreationResult {
  transactionId: string;
}

const toAuthority = (publicKey: string) => ({
  weight_threshold: 1,
  account_auths: {},
  key_auths: { [publicKey]: 1 }
});

const buildCreateOperation = async (request: AccountCreationRequest, config: AccountCreatorConfig): Promise<operation> => {
  const common = {
    creator: config.account,
    new_account_name: request.accountName,
    owner: toAuthority(request.publicKeys.owner),
    active: toAuthority(request.publicKeys.active),
    posting: toAuthority(request.publicKeys.posting),
    memo_key: request.publicKeys.memo,
    json_metadata: ''
  };

  if (config.useClaimedAccounts)
    return { create_claimed_account_operation: { ...common, extensions: [] } };

  return { account_create_operation: { ...common, fee: await getAccountCreationFee() } };
};

/** Signs and broadcasts the account creation on behalf of the configured creator account */
export const createHiveAccount = async (request: AccountCreationRequest): Promise<AccountCreationResult> => {
  const { creator } = requireAccountRequestConfig();
  const wax = await getServerWax();
  const { publicKey } = await getCreatorWallet();

  const transaction = await wax.createTransaction();
  transaction.pushOperation(await buildCreateOperation(request, creator));

  // Only the signing itself needs the wallet - chain lookups above must not block token issuance
  await withCreatorWallet(({ wallet }) => beekeeperProviderFactory.for(wax, wallet, publicKey).signTransaction(transaction));
  // The node validates the operation at broadcast - a taken account name is rejected here without spending the fee
  await wax.broadcast(transaction);

  return { transactionId: transaction.id };
};
