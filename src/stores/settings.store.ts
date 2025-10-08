import { defineStore } from 'pinia';

import cTokensLogoUrl from '@/assets/icons/wallets/ctokens.svg';
import keychainLogoUrl from '@/assets/icons/wallets/keychain.svg';
import metamaskLogoUrl from '@/assets/icons/wallets/metamask.svg';
import peakVaultLogoUrl from '@/assets/icons/wallets/peakvault.svg';

export enum UsedWallet {
  METAMASK,
  KEYCHAIN,
  PEAKVAULT,
  CTOKENS_IMPLEMENTATION
}

export const stringifyWalletName = (wallet: UsedWallet) => {
  switch (wallet) {
  case UsedWallet.METAMASK:
    return 'Metamask';
  case UsedWallet.KEYCHAIN:
    return 'Keychain';
  case UsedWallet.PEAKVAULT:
    return 'PeakVault';
  case UsedWallet.CTOKENS_IMPLEMENTATION:
    return 'cTokens';
  }
};

export const getWalletIcon = (wallet: UsedWallet) => {
  switch (wallet) {
  case UsedWallet.METAMASK:
    return metamaskLogoUrl;
  case UsedWallet.KEYCHAIN:
    return keychainLogoUrl;
  case UsedWallet.PEAKVAULT:
    return peakVaultLogoUrl;
  case UsedWallet.CTOKENS_IMPLEMENTATION:
    return cTokensLogoUrl;
  }
};

const settings = {
  wallet: undefined as UsedWallet | undefined,
  account: undefined as string | undefined
};
export type Settings = Required<typeof settings>;

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isLoaded: false,
    settings
  }),
  getters: {
    account: state => state.settings.account,
    wallet: state => state.settings.wallet
  },
  actions: {
    // Used for logout
    resetSettings () {
      this.setSettings({} as typeof settings);
    },
    loadSettings () {
      const localSettings = localStorage.getItem('hivebridge_settings');

      if (localSettings)
        this.setSettings(JSON.parse(localSettings));

      this.isLoaded = true;
    },
    saveSettings () {
      localStorage.setItem('hivebridge_settings', JSON.stringify(this.settings));
    },
    setSettings (data: typeof settings) {
      this.settings = data;

      this.saveSettings();
    }
  }
});
