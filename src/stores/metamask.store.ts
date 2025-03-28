import { defineStore } from "pinia"
import MetamaskProvider from "@hiveio/wax-signers-metamask";

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
    async connect() {
      try {
        this.performingOperation = true;

        if (!this.metamask)
          this.metamask = await MetamaskProvider.for(0);
      } finally {
        this.performingOperation = false;
      }
    },
    async install() {
      try {
        this.performingOperation = true;

        if (!this.metamask)
          throw new Error('Install: Metamask not connected');

        await this.metamask.installSnap();
      } finally {
        this.performingOperation = false;
      }
    }
  }
})
