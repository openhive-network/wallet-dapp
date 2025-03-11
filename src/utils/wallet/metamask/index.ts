import { getSnapsProvider } from "./provider";
import { defaultSnapOrigin } from "./snap";
import { MetamaskWallet, type MetamaskSnapsResponse } from "./metamask";

export type { MetamaskWallet };

/**
 * Connects to the metamask provider and returns a {@link MetamaskWallet} instance.
 */
export const connectMetamask = async (): Promise<MetamaskWallet> => {
  // Get the provider - this will be the MetaMask provider if it is installed
  const provider = await getSnapsProvider();
  if (!provider)
    throw new Error("Could not retrieve the provider. Make sure you have a wallet installed.");

  // Check for client version - detect if we are using metamask flask development version
  const clientVersion = await provider.request({ method: 'web3_clientVersion' });
  const isFlaskDetected = (clientVersion as string[])?.includes('flask');

  // Check if the snap is already installed
  const snaps = await provider.request({ method: 'wallet_getSnaps' }) as MetamaskSnapsResponse;
  const installedSnap = snaps[defaultSnapOrigin] ?? null;

  // Provide all of the data to our MetamaskWallet wrapper exposing the public API
  return new MetamaskWallet(provider, isFlaskDetected, installedSnap);
};
