
import type { TRole, TPublicKey, TAccountName, ITransaction } from "@hiveio/wax/vite";
import type { Wallet } from "../abstraction";

export const createPeakVaultWalletFor = (account: TAccountName) => {
  return new PeakVaultWallet(account);
};

export class PeakVaultWallet implements Wallet {
  public constructor(
    private readonly account: TAccountName
  ) {}

  public async signTransaction(transaction: ITransaction, role: TRole): Promise<void> {
    const response = await (window as any).peakvault.requestSignTx(this.account, JSON.parse(transaction.toLegacyApi()), role);

    for(const signature of response.result.signatures)
      transaction.sign(signature);
  }

  public async encrypt(buffer: string, recipient: TPublicKey): Promise<string> {
    const response = await (window as any).peakvault.requestEncodeWithKeys(this.account, "memo", [recipient], buffer.startsWith("#") ? buffer : `#${buffer}`);

    return response.result[0];
  }

  public async decrypt(buffer: string): Promise<string> {
    const response = await (window as any).peakvault.requestDecode(this.account, buffer, "memo");

    return response.result;
  }
}
