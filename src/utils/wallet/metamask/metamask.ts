import type { MetaMaskInpageProvider } from "@metamask/providers";
import { defaultSnapOrigin, defaultSnapVersion, isLocalSnap } from "./snap";
import type { Wallet } from "../abstraction";
import type { TPublicKey, TRole, ITransactionBase } from "@hiveio/wax/vite";

export type MetamaskSnapData = {
  permissionName: string;
  id: string;
  version: string;
  initialPermissions: Record<string, unknown>;
};
export type MetamaskSnapsResponse = Record<string, MetamaskSnapData>;

export class MetamaskWallet implements Wallet {
  /**
   * Indicates either the snap is installed or not.
   * If you want to install or reinstall the snap, use {@link installSnap}
   */
  public get isInstalled() {
    return !!this.currentSnap;
  }

  /**
   * Indicates either the snap is local or not.
   */
  public readonly isLocalSnap = isLocalSnap(defaultSnapOrigin);

  public constructor(
    private readonly provider: MetaMaskInpageProvider,
    public readonly isFlaskDetected: boolean,
    private currentSnap: MetamaskSnapData | null = null
  ) {}

  private request(method: string, params?: any) {
    return this.provider.request(params ? { method, params } : { method });
  }

  public async signTransaction(transaction: ITransactionBase, role: TRole) {
    const response = await this.invokeSnap('hive_signTransaction', { transaction: transaction.toApi(), keys: [{ role }] }) as any;

    return response.signatures[0];
  }

  public async encrypt(buffer: string, recipient: TPublicKey): Promise<string> {
    const response = await this.invokeSnap('hive_encrypt', { buffer, firstKey: { role: "memo" as TRole }, secondKey: recipient }) as any;

    return response.buffer;
  }

  public async decrypt(buffer: string): Promise<string> {
    const response = await this.invokeSnap('hive_decrypt', { buffer, firstKey: { role: "memo" as TRole } }) as any;

    return response.buffer;
  }

  /**
   * Request the snap to be installed or reinstalled.
   * You can check if snap is installed using {@link isInstalled}
   */
  public async installSnap(version: string | undefined = defaultSnapVersion) {
    const snaps = await this.request('wallet_requestSnaps', {
      [defaultSnapOrigin]: (typeof version === "undefined" || version.length === 0) ? {} : { version }
    }) as MetamaskSnapsResponse;

    this.currentSnap = snaps[defaultSnapOrigin]!;
  }

  /**
   * Invokes the snap method with the given parameters.
   * In order to call this method, you should install the snap first, see {@link isInstalled}
   */
  public async invokeSnap(method: string, params?: any) {
    if (!this.isInstalled)
      throw new Error('The snap is not installed');

    return this.request('wallet_invokeSnap', {
      snapId: defaultSnapOrigin,
      request: params ? { method, params } : { method },
    });
  }
}
