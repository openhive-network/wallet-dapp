import type { TPublicKey, TRole, ITransactionBase } from "@hiveio/wax/vite";

export interface Wallet {
  signTransaction(transaction: ITransactionBase, role: TRole): Promise<string>;
  encrypt(buffer: string, recipient: TPublicKey): Promise<string>;
  decrypt(buffer: string): Promise<string>;
}
