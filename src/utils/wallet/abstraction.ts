import type { TPublicKey, TRole, ITransaction } from "@hiveio/wax/vite";

export interface Wallet {
  signTransaction(transaction: ITransaction, role: TRole): Promise<void>;
  encrypt(buffer: string, recipient: TPublicKey): Promise<string>;
  decrypt(buffer: string): Promise<string>;
}
