import { defineStore } from "pinia"
import MetamaskProvider from "@hiveio/wax-signers-metamask";
import type { TRole } from "@hiveio/wax";
import { defaultSnapOrigin, defaultSnapVersion } from "@/utils/wallet/metamask/snap";

export const useMetamaskStore = defineStore('metamask', {
  state: () => ({
    metamask: undefined as undefined | MetamaskProvider,
    performingOperation: false
  }),
  getters: {
    isConnected: state => !!state.metamask,
    isFlask: state => state.metamask?.isFlaskDetected,
    isInstalled: state => state.metamask?.isSnapInstalled
  },
  actions: {
    async call(method: string, params: any) {
      try {
        this.performingOperation = true;

        if (!this.metamask)
          throw new Error('Call: Metamask not connected');

        return await this.metamask.invokeSnap(method, params);
        } finally {
          this.performingOperation = false;
        }
      },
    async connect(accountIndex: number, role?: TRole) {
      try {
        this.performingOperation = true;

        console.log('Connecting to Metamask with account index:', accountIndex, 'and role:', role);
        this.metamask = await MetamaskProvider.for(accountIndex, role, defaultSnapOrigin);
      } finally {
        this.performingOperation = false;
      }
    },
    async install() {
      try {
        this.performingOperation = true;

        if (!this.metamask)
          throw new Error('Install: Metamask not connected');

        await this.metamask.installSnap(defaultSnapVersion);
      } finally {
        this.performingOperation = false;
      }
    }
  }
})
