import type { TRole, TPublicKey, TAccountName, ITransactionBase } from "@hiveio/wax/vite";
import type { Wallet } from "../abstraction";

export const createKeychainWalletFor = (account: TAccountName) => {
  return new KeychainWallet(account);
};

export class KeychainWallet implements Wallet {
  public constructor(
    private readonly account: TAccountName
  ) {}

  public async signTransaction(transaction: ITransactionBase, role: TRole): Promise<string> {
    const response = await new Promise((resolve, reject) => (window as any).hive_keychain.requestSignTx(
      this.account,
      JSON.parse(transaction.toLegacyApi()),
      role,
      (response: any) => {
        if (response.error)
          reject(response);
        else
          resolve(response);
      }
    )) as any;

    return response.result.signatures;
  }

  public async encrypt(buffer: string, recipient: TPublicKey): Promise<string> {
    const response = await new Promise((resolve, reject) => (window as any).hive_keychain.requestEncodeWithKeys(
      this.account,
      [recipient],
      buffer.startsWith("#") ? buffer : `#${buffer}`,
      "memo",
      (response: any) => {
        if (response.error)
          reject(response);
        else
          resolve(response);
      }
    )) as any;

    return Object.values(response.result)[0] as string;
  }

  public async decrypt(buffer: string): Promise<string> {
    const response = await new Promise((resolve, reject) => (window as any).hive_keychain.requestVerifyKey(
      this.account,
      buffer,
      "memo",
      (response: any) => {
        if (response.error)
          reject(response);
        else
          resolve(response);
      }
    )) as any;


    return response.result;
  }
}
