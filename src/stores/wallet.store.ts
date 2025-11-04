import type { AEncryptionProvider, TRole } from '@hiveio/wax';
import KeychainProvider from '@hiveio/wax-signers-keychain';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { toast } from 'vue-sonner';

import { getWax } from '@/stores/wax.store';
import CTokensProvider from '@/utils/wallet/ctokens/signer';
import GoogleDriveWalletProvider from '@/utils/wallet/google-drive/provider';

import { useMetamaskStore } from './metamask.store';
import { type Settings, UsedWallet } from './settings.store';
import { useTokensStore } from './tokens.store';

let walletRetrievalIntervalId: NodeJS.Timeout | undefined;

const intervalIds = new Set<NodeJS.Timeout>();

// Do not watch for changes inside the current wallet - its only a tool we call functions from
const currentWallet = shallowRef<AEncryptionProvider | undefined>(undefined);

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    _walletsStatus: {
      metamask: false,
      keychain: false,
      peakvault: false,
      ctokens: true,
      googleDrive: false
    },
    _lastGoogleDriveCheck: 0,
    isL2Wallet: false,
    isWalletSelectModalOpen: false,
    isProvideWalletPasswordModalOpen: false
  }),
  getters: {
    wallet: () => currentWallet.value,
    hasWallet: () => !!currentWallet.value,
    walletsStatus: state => {
      if (!walletRetrievalIntervalId && import.meta.client) {
        const checkForWallets = async () => {
          if (!state._walletsStatus.metamask)
            MetaMaskProvider.isExtensionInstalled().then(isInstalled => state._walletsStatus.metamask = isInstalled);

          if (!state._walletsStatus.keychain)
            state._walletsStatus.keychain = 'hive_keychain' in window;

          if (!state._walletsStatus.peakvault)
            state._walletsStatus.peakvault = 'peakvault' in window;

          // Check Google Drive authentication status - but only once per 10 seconds to avoid spam
          const now = Date.now();
          const timeSinceLastCheck = now - state._lastGoogleDriveCheck;
          const shouldCheckGoogleDrive = !state._walletsStatus.googleDrive && timeSinceLastCheck > 10000;

          if (shouldCheckGoogleDrive) {
            state._lastGoogleDriveCheck = now;
            try {
              const response = await fetch('/api/google-drive/oauth-status');
              const data = await response.json();
              state._walletsStatus.googleDrive = data.authenticated || false;
            }
            catch {
              state._walletsStatus.googleDrive = false;
            }
          }
          // KeychainProvider.isExtensionInstalled().then(isInstalled => state._walletsStatus.keychain = isInstalled);
          // PeakVaultProvider.isExtensionInstalled().then(isInstalled => state._walletsStatus.peakvault = isInstalled);
        };

        walletRetrievalIntervalId = setInterval(checkForWallets, 1000);
        void checkForWallets();
      }

      return state._walletsStatus;
    }
  },
  actions: {
    async recheckGoogleDriveStatus () {
      // Force recheck by resetting the timer
      this._lastGoogleDriveCheck = 0;
      try {
        const response = await fetch('/api/google-drive/oauth-status');
        const data = await response.json();
        this._walletsStatus.googleDrive = data.authenticated || false;
      }
      catch {
        this._walletsStatus.googleDrive = false;
      }
    },
    openWalletSelectModal () {
      this.isWalletSelectModalOpen = true;

      // Recheck Google Drive status when opening modal
      void this.recheckGoogleDriveStatus();

      // Allow functionality of waiting for wallet to be added / selected
      return new Promise<void>((resolve, reject) => {
        let intervalId: NodeJS.Timeout;
        intervalIds.add(intervalId = setInterval(() => {
          if (!this.isWalletSelectModalOpen) {
            clearInterval(intervalId);
            intervalIds.delete(intervalId);
            if (this.wallet)
              resolve();
            else
              reject(new Error('Wallet wasn\'t selected'));
          }
        }, 1000));
      });
    },
    closeWalletSelectModal () {
      this.isWalletSelectModalOpen = false;
    },
    async createWalletFor (settings: Settings, role: TRole) {
      switch(settings.wallet) {
      case UsedWallet.METAMASK: {
        const metamaskStore = useMetamaskStore();

        await metamaskStore.connect(0, role);

        currentWallet.value = metamaskStore.metamask;
        this.isL2Wallet = false;

        break;
      }
      case UsedWallet.KEYCHAIN: {
        currentWallet.value = KeychainProvider.for(settings.account!, role);
        this.isL2Wallet = false;

        break;
      }
      case UsedWallet.PEAKVAULT: {
        currentWallet.value = PeakVaultProvider.for(settings.account!, role);
        this.isL2Wallet = false;

        break;
      }
      case UsedWallet.GOOGLE_DRIVE: {
        currentWallet.value = await GoogleDriveWalletProvider.for(role);
        this.isL2Wallet = false;

        break;
      }
      case UsedWallet.CTOKENS_IMPLEMENTATION: {
        if (!CTokensProvider.isLoggedIn()) {
          toast.warning('Please provide the password to unlock your wallet', { duration: 5000 });

          this.isProvideWalletPasswordModalOpen = true;

          return;
        }

        const wax = await getWax();

        currentWallet.value = await CTokensProvider.for(wax, role);

        const tokensStore = useTokensStore();

        await tokensStore.reset(currentWallet.value as CTokensProvider);
        this.isL2Wallet = true;

        break;
      }
      default:
        throw new Error('Unsupported wallet');
      }
    },
    resetWallet () {
      (currentWallet.value as AEncryptionProvider & { destroy?: () => void })?.destroy?.();
      currentWallet.value = undefined;
    }
  }
});
