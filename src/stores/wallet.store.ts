import type { AEncryptionProvider, TRole } from '@hiveio/wax/vite';
import KeychainProvider from '@hiveio/wax-signers-keychain';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
import { defineStore } from 'pinia';
import { toast } from 'vue-sonner';

import { getWax } from '@/stores/wax.store';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

import { useMetamaskStore } from './metamask.store';
import { type Settings, UsedWallet } from './settings.store';


let walletRetrievalIntervalId: NodeJS.Timeout | undefined;

const intervalIds = new Set<NodeJS.Timeout>();

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    _walletsStatus: {
      metamask: false,
      keychain: false,
      peakvault: false,
      ctokens: true
    },
    wallet: undefined as undefined | AEncryptionProvider,
    isWalletSelectModalOpen: false,
    isProvideWalletPasswordModalOpen: false
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
    async createWalletFor (settings: Settings, role: TRole) {
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
      case UsedWallet.CTOKENS_IMPLEMENTATION: {
        if (!CTokensProvider.isLoggedIn()) {
          toast.warning('Please provide the password to unlock your wallet', { duration: 5000 });

          this.isProvideWalletPasswordModalOpen = true;

          return;
        }

        const wax = await getWax();

        this.wallet = await CTokensProvider.for(wax, role);

        break;
      }
      default:
        throw new Error('Unsupported wallet');
      }
    },
    resetWallet () {
      (this.wallet as AEncryptionProvider & { destroy?: () => void })?.destroy?.();
      this.wallet = undefined;
    }
  }
});
