import { defineStore } from "pinia";
import type { Wallet } from "@/utils/wallet/abstraction";
import { type Settings, UsedWallet } from "./settings.store";
import { useMetamaskStore } from "./metamask.store";
import { createKeychainWalletFor } from "@/utils/wallet/keychain";
import { createPeakVaultWalletFor } from "@/utils/wallet/peakvault";

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    wallet: undefined as undefined | Wallet
  }),
  getters: {
    hasWallet: state => !!state.wallet,
  },
  actions: {
    async createWalletFor(settings: Settings) {
      switch(settings.wallet) {
        case UsedWallet.METAMASK: {
          const metamaskStore = useMetamaskStore();

          await metamaskStore.connect();

          this.wallet = metamaskStore.metamask;

          break;
        }
        case UsedWallet.KEYCHAIN: {
          this.wallet = createKeychainWalletFor(settings.account!);

          break;
        }
        case UsedWallet.PEAKVAULT: {
          this.wallet = createPeakVaultWalletFor(settings.account!);

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
