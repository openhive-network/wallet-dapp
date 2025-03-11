import type { MetaMaskInpageProvider } from "@metamask/providers";
import { defaultSnapOrigin, isLocalSnap } from "./snap";

export type MetamaskSnapData = {
  permissionName: string;
  id: string;
  version: string;
  initialPermissions: Record<string, unknown>;
};
export type MetamaskSnapsResponse = Record<string, MetamaskSnapData>;

export class MetamaskWallet {
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

  /**
   * Request the snap to be installed or reinstalled.
   * You can check if snap is installed using {@link isInstalled}
   */
  public async installSnap(version?: string) {
    const snaps = await this.request('wallet_requestSnaps', {
      [defaultSnapOrigin]: version ? { version } : {}
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
