import MetaMaskProvider from '@hiveio/wax-signers-metamask';


import { useMetamaskStore } from '@/stores/metamask.store';
import { UsedWallet } from '@/stores/settings.store';
import { connectAccountWithWallet } from '@/utils/wallet/connect-account';

import type { AccountPublicKeys } from '#shared/types/account-request';

import { waitForAccountOnChain } from '../on-chain';

import type { AccountRegistrationStrategy } from './types';

export class MetamaskNotInstalledError extends Error {
  public constructor () {
    super('MetaMask extension is not installed');
    this.name = 'MetamaskNotInstalledError';
  }
}

/** Connects MetaMask, installs the Hive Wallet snap when missing and reads the public keys derived by the snap */
const readMetamaskPublicKeys = async (): Promise<AccountPublicKeys> => {
  if (!await MetaMaskProvider.isExtensionInstalled())
    throw new MetamaskNotInstalledError();

  const metamaskStore = useMetamaskStore();

  await metamaskStore.connect(0, 'posting');

  if (!metamaskStore.isInstalled())
    await metamaskStore.install();

  if (!metamaskStore.isInstalled())
    throw new Error('Hive Wallet snap installation was not completed');

  return await metamaskStore.metamask!.getPublicKeys('owner', 'active', 'posting', 'memo');
};

/** Keys are derived and kept by the MetaMask Hive snap - only public keys leave the wallet */
export const createMetamaskStrategy = (): AccountRegistrationStrategy => ({
  method: 'metamask',
  preparingMessage: 'Connecting to MetaMask and reading the public keys of your new account...',
  prepare: async () => ({ publicKeys: await readMetamaskPublicKeys() }),
  onCreated: async (accountName) => {
    if (!await waitForAccountOnChain(accountName))
      return;

    await connectAccountWithWallet(accountName, UsedWallet.METAMASK);
  }
});
