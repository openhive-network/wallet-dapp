/// <reference types="vite/client" />

import type { MetaMaskInpageProvider, EIP6963AnnounceProviderEvent } from "@metamask/providers";

declare global {
  const __COMMIT_HASH__: string;

  interface Window {
    ethereum?: MetaMaskInpageProvider & {
      detected?: MetaMaskInpageProvider[];
      providers?: MetaMaskInpageProvider[];
    }
    hive_keychain
    peakvault
  }
  interface WindowEventMap {
    'eip6963:announceProvider': EIP6963AnnounceProviderEvent;
  }
}
