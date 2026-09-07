import type { IWaxBaseInterface, TRole } from '@hiveio/wax';

import { ACCOUNT_ROLES, type AccountPublicKeys } from '#shared/types/account-request';

export type AccountRoleKeys = Record<TRole, string>;

export interface AccountAuthorityData {
  masterPassword: string;
  privateKeys: AccountRoleKeys;
  publicKeys: AccountPublicKeys;
}

export const createEmptyRoleKeys = (): AccountRoleKeys => ({
  owner: '',
  active: '',
  posting: '',
  memo: ''
});

/** Derives the full authority key set of an account from its master password (standard Hive derivation) */
export const deriveAccountAuthorityData = (wax: IWaxBaseInterface, accountName: string, masterPassword: string): AccountAuthorityData => {
  const privateKeys = createEmptyRoleKeys();
  const publicKeys = createEmptyRoleKeys();

  for (const role of ACCOUNT_ROLES) {
    const { wifPrivateKey, associatedPublicKey } = wax.getPrivateKeyFromPassword(accountName, role, masterPassword);

    privateKeys[role] = wifPrivateKey;
    publicKeys[role] = associatedPublicKey;
  }

  return { masterPassword, privateKeys, publicKeys };
};

/** Generates a random master password and derives the authority key set from it */
export const generateAccountAuthorityData = (wax: IWaxBaseInterface, accountName: string): AccountAuthorityData =>
  deriveAccountAuthorityData(wax, accountName, wax.suggestBrainKey().wifPrivateKey);
