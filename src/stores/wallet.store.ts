import { defineStore } from "pinia";
import type { Wallet } from "@/utils/wallet/abstraction";
import { type Settings, UsedWallet } from "./settings.store";
import { useMetamaskStore } from "./metamask.store";
import KeychainProvider from "@hiveio/wax-signers-keychain";
import PeakVaultProvider from "@hiveio/wax-signers-peakvault";
import type { TRole } from "@hiveio/wax/vite";

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
        const metamaskStore = useMetamaskStore();

        const checkForWallets = () => {
          metamaskStore.connect().then(() => state._walletsStatus.metamask = true).catch(() => {});
          state._walletsStatus.keychain = "hive_keychain" in window;
          state._walletsStatus.peakvault = "peakvault" in window;
        };

        walletRetrievalIntervalId = setInterval(checkForWallets, 1000);
        checkForWallets();
      }

      return state._walletsStatus;
    }
  },
  actions: {
    openWalletSelectModal() {
      this.isWalletSelectModalOpen = true;

      // Allow functionality of waiting for wallet to be added / selected
      return new Promise<void>(resolve => {
        let intervalId: NodeJS.Timeout;
        intervalIds.add(intervalId = setInterval(() => {
          if (this.wallet && !this.isWalletSelectModalOpen) {
            clearInterval(intervalId);
            intervalIds.delete(intervalId);
            resolve();
          }
        }, 1000));
      });
    },
    closeWalletSelectModal() {
      this.isWalletSelectModalOpen = false;
    },
    async createWalletFor(settings: Settings, role: TRole = "posting") {
      switch(settings.wallet) {
        case UsedWallet.METAMASK: {
          const metamaskStore = useMetamaskStore();

          await metamaskStore.connect();

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
          throw new Error("Unsupported wallet");
      }
    },
    resetWallet() {
      this.wallet = undefined;
    }
  }
})
