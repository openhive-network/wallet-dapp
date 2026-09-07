import type { TRole } from '@hiveio/wax';


import { useGoogleDriveWallet } from '@/composables/useGoogleDriveWallet';
import { UsedWallet, useSettingsStore } from '@/stores/settings.store';
import { getWax } from '@/stores/wax.store';
import { connectAccountWithWallet } from '@/utils/wallet/connect-account';

import { ACCOUNT_ROLES } from '#shared/types/account-request';

import { generateAccountAuthorityData, type AccountAuthorityData } from '../keys';
import { waitForAccountOnChain } from '../on-chain';

import type { AccountRegistrationStrategy } from './types';

export interface GoogleDriveStrategyOptions {
  /** Whether the user already has a Google Drive wallet file (keys are added to it instead of creating a new one) */
  walletExists: boolean;
  /** Recovery password encrypting a newly created wallet file - required when `walletExists` is false */
  recoveryPassword?: string;
}

export type GoogleDriveRegistrationPrecheck =
  | { authenticated: false }
  | { authenticated: true; walletExists: boolean };

const GOOGLE_AUTH_EXPIRED_CODE = 'GOOGLE_AUTH_EXPIRED';

/** Checks the Google session and whether a wallet file already exists - an expired session counts as signed out */
export const checkGoogleDriveRegistration = async (): Promise<GoogleDriveRegistrationPrecheck> => {
  const settingsStore = useSettingsStore();

  await settingsStore.checkGoogleAuth();

  if (!settingsStore.isGoogleAuthenticated)
    return { authenticated: false };

  try {
    const { exists } = await useGoogleDriveWallet().getWalletInfo();

    return { authenticated: true, walletExists: exists };
  } catch (error) {
    if ((error as { code?: string }).code === GOOGLE_AUTH_EXPIRED_CODE)
      return { authenticated: false };

    throw error;
  }
};

/**
 * Keys are generated locally from a random master password and stored encrypted
 * in the user's Google Drive wallet before the account gets created.
 */
export const createGoogleDriveStrategy = ({ walletExists, recoveryPassword }: GoogleDriveStrategyOptions): AccountRegistrationStrategy => {
  const drive = useGoogleDriveWallet();

  const storeKeysInDrive = async (accountName: string, { privateKeys }: AccountAuthorityData) => {
    let rolesToAdd: TRole[] = [...ACCOUNT_ROLES];

    if (!walletExists) {
      if (!recoveryPassword)
        throw new Error('Recovery password is required to create a Google Drive wallet');

      const [firstRole, ...remainingRoles] = rolesToAdd;
      await drive.createWallet(accountName, privateKeys[firstRole!], firstRole!, recoveryPassword);
      rolesToAdd = remainingRoles;
    }

    for (const role of rolesToAdd)
      await drive.addKey(accountName, role, privateKeys[role]);
  };

  return {
    method: 'google',
    preparingMessage: 'Generating the account keys and storing them encrypted in your Google Drive...',
    prepare: async (accountName) => {
      const wax = await getWax();
      const authorityData = generateAccountAuthorityData(wax, accountName);

      await storeKeysInDrive(accountName, authorityData);

      return { publicKeys: authorityData.publicKeys, authorityData };
    },
    onCreated: async (accountName) => {
      if (!await waitForAccountOnChain(accountName))
        return;

      try {
        useSettingsStore().syncGoogleDriveAccounts(await drive.getStoredAccounts());
      } catch {
        // Non-critical - the account list refreshes on the next wallet load
      }

      await connectAccountWithWallet(accountName, UsedWallet.GOOGLE_DRIVE);
    },
    onFailed: async (accountName) => {
      // Best-effort cleanup of keys stored for an account that was never created
      for (const role of ACCOUNT_ROLES) {
        try {
          await drive.removeKey(accountName, undefined, role);
        } catch {}
      }
    }
  };
};
