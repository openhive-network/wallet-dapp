import { defineStore } from 'pinia';

import cTokensLogoUrl from '@/assets/icons/wallets/ctokens.svg';
import googleDriveLogoUrl from '@/assets/icons/wallets/google-drive.svg';
import keychainLogoUrl from '@/assets/icons/wallets/keychain.svg';
import metamaskLogoUrl from '@/assets/icons/wallets/metamask.svg';
import peakVaultLogoUrl from '@/assets/icons/wallets/peakvault.svg';
import { toastError } from '@/utils/parse-error';

export enum UsedWallet {
  METAMASK,
  KEYCHAIN,
  PEAKVAULT,
  CTOKENS_IMPLEMENTATION,
  GOOGLE_DRIVE
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
  case UsedWallet.GOOGLE_DRIVE:
    return 'GoogleDrive';
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
  case UsedWallet.GOOGLE_DRIVE:
    return googleDriveLogoUrl;
  }
};

const settings = {
  wallet: undefined as UsedWallet | undefined,
  account: undefined as string | undefined,
  googleDriveSync: false as boolean,
  lastGoogleSyncTime: undefined as number | undefined
};
export type Settings = Required<typeof settings>;

interface GoogleUser {
  name: string;
  email: string;
  picture?: string;
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isLoaded: false,
    settings,
    googleUser: null as GoogleUser | null,
    isGoogleAuthenticated: false,
    isSyncing: false,
    lastSyncError: null as string | null
  }),
  getters: {
    account: state => state.settings.account,
    wallet: state => state.settings.wallet
  },
  actions: {
    // Used for logout
    resetSettings () {
      this.setSettings({} as typeof settings);
      this.googleUser = null;
      this.isGoogleAuthenticated = false;
    },
    async loadSettings () {
      const localSettings = localStorage.getItem('hivebridge_settings');

      if (localSettings)
        this.setSettings(JSON.parse(localSettings));

      this.isLoaded = true;

      // Check Google auth status
      await this.checkGoogleAuth();

      // Auto-sync if enabled
      if (this.settings.googleDriveSync && this.isGoogleAuthenticated)
        await this.syncFromGoogleDrive();
    },
    saveSettings () {
      localStorage.setItem('hivebridge_settings', JSON.stringify(this.settings));

      // Auto-sync to Google Drive if enabled
      if (this.settings.googleDriveSync && this.isGoogleAuthenticated)
        void this.syncToGoogleDrive();
    },
    setSettings (data: typeof settings) {
      this.settings = data;

      this.saveSettings();
    },

    // Google Drive integration
    async checkGoogleAuth () {
      try {
        const { getAuthStatus } = useGoogleAuth();
        const response = getAuthStatus();
        this.isGoogleAuthenticated = response.authenticated;
        this.googleUser = response.user;
      } catch (_error) {
        this.isGoogleAuthenticated = false;
        this.googleUser = null;
      }
    },

    loginWithGoogle (returnUrl?: string) {
      const currentUrl = returnUrl || window.location.pathname;
      window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(currentUrl)}`;
    },

    async logoutFromGoogle () {
      try {
        await $fetch('/api/auth/google/logout', { method: 'POST' });
        this.isGoogleAuthenticated = false;
        this.googleUser = null;
        this.settings.googleDriveSync = false;
        this.saveSettings();
      } catch (error) {
        toastError('Failed to logout from Google', error);
        throw error;
      }
    },

    async syncToGoogleDrive () {
      if (!this.isGoogleAuthenticated)
        return;

      try {
        this.isSyncing = true;
        this.lastSyncError = null;

        await $fetch('/api/google-drive/settings', {
          method: 'POST',
          body: {
            settings: this.settings,
            timestamp: Date.now()
          }
        });

        this.settings.lastGoogleSyncTime = Date.now();
        localStorage.setItem('hivebridge_settings', JSON.stringify(this.settings));
      } catch (error: unknown) {
        const errorMessage = error && typeof error === 'object' && 'data' in error
          ? ((error as { data?: { message?: string } }).data?.message || 'Failed to sync to Google Drive')
          : 'Failed to sync to Google Drive';
        this.lastSyncError = errorMessage;
        toastError('Sync to Google Drive failed', error);
        throw error;
      } finally {
        this.isSyncing = false;
      }
    },

    async syncFromGoogleDrive () {
      if (!this.isGoogleAuthenticated)
        return;

      try {
        this.isSyncing = true;
        this.lastSyncError = null;

        const response = await $fetch<{
          success: boolean;
          data?: { settings?: typeof settings; timestamp?: number } | null;
          exists: boolean;
        }>('/api/google-drive/settings');

        if (response.exists && response.data?.settings) {
          // Check if remote is newer
          const remoteTime = response.data.timestamp || 0;
          const localTime = this.settings.lastGoogleSyncTime || 0;

          if (remoteTime > localTime) {
            // Merge remote settings (preserve local if not in remote)
            this.settings = {
              ...this.settings,
              ...response.data.settings,
              lastGoogleSyncTime: remoteTime
            };
            localStorage.setItem('hivebridge_settings', JSON.stringify(this.settings));
          }
        }
      } catch (error: unknown) {
        const errorMessage = error && typeof error === 'object' && 'data' in error
          ? ((error as { data?: { message?: string } }).data?.message || 'Failed to sync from Google Drive')
          : 'Failed to sync from Google Drive';
        this.lastSyncError = errorMessage;
        toastError('Sync from Google Drive failed', error);
        throw error;
      } finally {
        this.isSyncing = false;
      }
    },

    toggleGoogleDriveSync (enabled: boolean) {
      this.settings.googleDriveSync = enabled;
      this.saveSettings();

      if (enabled && this.isGoogleAuthenticated)
        void this.syncToGoogleDrive();
    },

    clearSyncError () {
      this.lastSyncError = null;
    }
  }
});
