import { getWax } from '@/stores/wax.store';

import { downloadAuthorityDataFile } from '../authority-data';
import { deriveAccountAuthorityData } from '../keys';

import type { AccountRegistrationStrategy } from './types';

export const MIN_ACCOUNT_PASSWORD_LENGTH = 12;

/** Keys are deterministically derived from the account name and the user chosen master password */
export const createPasswordStrategy = (password: string): AccountRegistrationStrategy => ({
  method: 'password',
  preparingMessage: 'Deriving the account keys from your password...',
  prepare: async (accountName) => {
    const wax = await getWax();
    const authorityData = deriveAccountAuthorityData(wax, accountName, password);

    return { publicKeys: authorityData.publicKeys, authorityData };
  },
  onCreated: async (accountName, _result, keys) => {
    // The password is the only way back to the keys - hand the authority file over right away
    if (keys.authorityData)
      downloadAuthorityDataFile(accountName, keys.authorityData);
  }
});
