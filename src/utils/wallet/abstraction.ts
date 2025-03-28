import type { IOnlineSignatureProviderSignTransaction, IOnlineEncryptionProvider } from "@hiveio/wax/vite";

export type Wallet = IOnlineEncryptionProvider & IOnlineSignatureProviderSignTransaction;
