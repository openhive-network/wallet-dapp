import type { ITransaction, TPublicKey } from '@hiveio/wax';

export type Wallet = {
  signTransaction(tranasction: ITransaction): Promise<void>;
  encryptData(data: string, recipient: TPublicKey): Promise<string>;
  decryptData(data: string): Promise<string>;
};
