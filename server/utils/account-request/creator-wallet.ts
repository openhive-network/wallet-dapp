import createBeekeeper, { type IBeekeeperUnlockedWallet } from '@hiveio/beekeeper';

import { requireAccountRequestConfig } from './config';

export interface CreatorWallet {
  wallet: IBeekeeperUnlockedWallet;
  publicKey: string;
}

/** The wallet lives as long as the server process - it must never lock itself in the meantime */
const WALLET_UNLOCK_TIMEOUT_SECONDS = 365 * 24 * 60 * 60;

let cached: { activeKey: string; promise: Promise<CreatorWallet> } | undefined;

const openCreatorWallet = async (activeKey: string): Promise<CreatorWallet> => {
  const beekeeper = await createBeekeeper({ inMemory: true, unlockTimeout: WALLET_UNLOCK_TIMEOUT_SECONDS });

  try {
    const session = beekeeper.createSession(Math.random().toString());
    const { wallet } = await session.createWallet('account-creator', Math.random().toString(36), true);

    let publicKey: string;
    try {
      publicKey = await wallet.importKey(activeKey);
    } catch {
      throw new Error('Configured creator active key is not a valid WIF private key');
    }

    return { wallet, publicKey };
  } catch (error) {
    await beekeeper.delete();
    throw error;
  }
};

/**
 * In-memory beekeeper wallet holding the creator account active key, shared by the whole process.
 * The key is read straight from the runtime config, so no caller ever handles the credentials.
 * It issues and verifies request tokens (memo encryption) and signs the account creation transactions.
 */
export const getCreatorWallet = (): Promise<CreatorWallet> => {
  const { activeKey } = requireAccountRequestConfig().creator;

  if (cached?.activeKey !== activeKey) {
    cached = {
      activeKey,
      promise: openCreatorWallet(activeKey).catch((error: unknown) => {
        if (cached?.activeKey === activeKey)
          cached = undefined;

        throw error;
      })
    };
  }

  return cached.promise;
};

let walletQueue: Promise<unknown> = Promise.resolve();

/**
 * Runs an operation on the creator wallet with exclusive access.
 * Beekeeper's WASM runtime is not reentrant - concurrent calls abort the whole instance - so every
 * encryption, decryption and signing request is queued and executed one at a time.
 */
export const withCreatorWallet = <T> (operation: (creatorWallet: CreatorWallet) => Promise<T>): Promise<T> => {
  const run = walletQueue.then(async () => await operation(await getCreatorWallet()));

  walletQueue = run.catch(() => undefined);

  return run;
};
