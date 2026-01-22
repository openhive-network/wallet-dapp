/// <reference types="vite/client" />

import type { MetaMaskInpageProvider, EIP6963AnnounceProviderEvent } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider & {
      detected?: MetaMaskInpageProvider[];
      providers?: MetaMaskInpageProvider[];
    }
    hive_keychain: {
      requestSignBuffer: (_0: null, _1: string, _2: string | null, _3: (response: KeychainResponse) => void, _4: undefined, _5: string) => Promise<KeychainResponse>;
    },
    peakvault: {
      requestContact: () => Promise<{ result: string }>;
    }
  }
  interface WindowEventMap {

    'eip6963:announceProvider': EIP6963AnnounceProviderEvent;
  }
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
