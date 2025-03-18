import type { TRole, TPublicKey, TAccountName, ITransaction } from "@hiveio/wax/vite";
import type { Wallet } from "../abstraction";

export const createKeychainWalletFor = (account: TAccountName) => {
  return new KeychainWallet(account);
};

export class KeychainWallet implements Wallet {
  public constructor(
    private readonly account: TAccountName
  ) {}

  public async signTransaction(transaction: ITransaction, role: TRole): Promise<void> {
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

    for(const signature of response.result.signatures)
      transaction.sign(signature);
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
