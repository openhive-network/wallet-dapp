import type { TRole } from '@hiveio/wax';
import MetamaskProvider from '@hiveio/wax-signers-metamask';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import { defaultSnapOrigin, defaultSnapVersion } from '@/utils/wallet/metamask/snap';

// Do not watch for changes inside the metamask wallet - its only a tool we call functions from
const metamaskWallet = shallowRef<MetamaskProvider | undefined>(undefined);

export const useMetamaskStore = defineStore('metamask', {
  state: () => ({
    performingOperation: false
  }),
  getters: {
    metamask: () => metamaskWallet.value,
    isConnected: () => !!metamaskWallet.value,
    isFlask: () => metamaskWallet.value?.isFlaskDetected
  },
  actions: {
    async call (method: string, params: unknown[] | Record<string, unknown> | undefined) {
      try {
        this.performingOperation = true;

        if (!this.metamask)
          throw new Error('Call: Metamask not connected');

        return await this.metamask.invokeSnap(method, params);
      } finally {
        this.performingOperation = false;
      }
    },
    async connect (accountIndex: number, role: TRole) {
      try {
        this.performingOperation = true;

        console.log('Connecting to Metamask with account index:', accountIndex, 'and role:', role);
        metamaskWallet.value = await MetamaskProvider.for(accountIndex, role, defaultSnapOrigin);
      } finally {
        this.performingOperation = false;
      }
    },
    async install () {
      try {
        this.performingOperation = true;

        if (!this.metamask)
          throw new Error('Install: Metamask not connected');

        await this.metamask.installSnap(defaultSnapVersion);
      } finally {
        this.performingOperation = false;
      }
    },
    isInstalled () {
      return this.metamask?.isSnapInstalled ?? false;
    }
  }
});
