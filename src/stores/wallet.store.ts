import type { TRole } from '@hiveio/wax/vite';
import KeychainProvider from '@hiveio/wax-signers-keychain';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
import { defineStore } from 'pinia';

import type { Wallet } from '@/utils/wallet/abstraction';

import { useMetamaskStore } from './metamask.store';
import { type Settings, UsedWallet } from './settings.store';

let walletRetrievalIntervalId: NodeJS.Timeout | undefined;

const intervalIds = new Set<NodeJS.Timeout>();

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    _walletsStatus: {
      metamask: false,
      keychain: false,
      peakvault: false
    },
    wallet: undefined as undefined | Wallet,
    isWalletSelectModalOpen: false
  }),
  getters: {
    hasWallet: state => !!state.wallet,
    walletsStatus: state => {
      if (!walletRetrievalIntervalId) {
        const checkForWallets = () => {
          if (!state._walletsStatus.metamask)
            MetaMaskProvider.isExtensionInstalled().then(isInstalled => state._walletsStatus.metamask = isInstalled);

          if (!state._walletsStatus.keychain)
            state._walletsStatus.keychain = 'hive_keychain' in window;

          if (!state._walletsStatus.peakvault)
            state._walletsStatus.peakvault = 'peakvault' in window;
          // KeychainProvider.isExtensionInstalled().then(isInstalled => state._walletsStatus.keychain = isInstalled);
          // PeakVaultProvider.isExtensionInstalled().then(isInstalled => state._walletsStatus.peakvault = isInstalled);
        };

        walletRetrievalIntervalId = setInterval(checkForWallets, 1000);
        checkForWallets();
      }

      return state._walletsStatus;
    }
  },
  actions: {
    openWalletSelectModal () {
      this.isWalletSelectModalOpen = true;

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
    async createWalletFor (settings: Settings, role: TRole = 'posting') {
      switch(settings.wallet) {
      case UsedWallet.METAMASK: {
        const metamaskStore = useMetamaskStore();

        await metamaskStore.connect(0, role);

        this.wallet = metamaskStore.metamask;

        break;
      }
      case UsedWallet.KEYCHAIN: {
        this.wallet = KeychainProvider.for(settings.account!, role);

        break;
      }
      case UsedWallet.PEAKVAULT: {
        this.wallet = PeakVaultProvider.for(settings.account!, role);

        break;
      }
      default:
        throw new Error('Unsupported wallet');
      }
    },
    resetWallet () {
      this.wallet = undefined;
    }
  }
});
