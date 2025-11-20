import createBeekeeper from '@hiveio/beekeeper';
import type { IBeekeeperInstance, IBeekeeperSession, IBeekeeperUnlockedWallet } from '@hiveio/beekeeper';
import type { IHiveChainInterface, TPublicKey, TRole } from '@hiveio/wax';
import { ExternalSignatureProvider, GoogleStorageProvider, type IWalletData } from '@hiveio/wax-signers-external';

const WALLET_FILE_NAME = 'hivebridge_wallet.json';
const WALLET_PASSWORD = crypto.randomUUID();

interface GoogleDriveState {
  beekeeper: IBeekeeperInstance | null;
  sessions: Map<TRole, IBeekeeperUnlockedWallet>;
  providers: Map<TRole, ExternalSignatureProvider>;
  accountName: string | null;
}

const state: GoogleDriveState = {
  beekeeper: null,
  sessions: new Map(),
  providers: new Map(),
  accountName: null
};

/**
 * Google Drive Wallet Provider
 * Compatible with wallet.store.ts infrastructure
 * Uses ExternalSignatureProvider from @hiveio/wax-signers-external (which extends AEncryptionProvider)
 */

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GoogleDriveWalletProvider {
  private constructor () {}

  /**
   * Check if user is authenticated with Google
   */
  public static async isAuthenticated (): Promise<boolean> {
    try {
      const response = await $fetch<{ authenticated: boolean }>('/api/google-drive/oauth-status');
      return response.authenticated;
    } catch {
      return false;
    }
  }

  /**
   * Get OAuth login URL
   */
  public static getLoginUrl (): string {
    return '/api/auth/google/login';
  }

  private static async initBeekeeper () {
    if (!state.beekeeper) {
      const beekeeper = await createBeekeeper({ inMemory: true, enableLogs: false, unlockTimeout: 365 * 24 * 60 * 60 * 1000 });
      state.beekeeper = beekeeper;
    }
  }

  private static async getChain (): Promise<IHiveChainInterface> {
    const { getWax } = await import('@/stores/wax.store');
    return await getWax();
  }

  private static async createStorageProvider (): Promise<GoogleStorageProvider> {
    return new GoogleStorageProvider(async () => {
      const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
      return response.token;
    });
  }

  private static async getOrCreateWallet (session: IBeekeeperSession, walletName: string): Promise<IBeekeeperUnlockedWallet> {
    if (session.hasWallet(walletName)) {
      const lockedWallet = session.openWallet(walletName);
      return lockedWallet.unlocked ? lockedWallet.unlocked : lockedWallet.unlock(WALLET_PASSWORD);
    }
    return (await session.createWallet(walletName, WALLET_PASSWORD)).wallet;
  }



  /**
   * Create a new wallet and save to Google Drive
   */
  public static async createWallet (
    accountName: string,
    keys: { posting?: string; active?: string; owner?: string; memo?: string }
  ): Promise<{ [K in TRole]?: TPublicKey }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    await GoogleDriveWalletProvider.initBeekeeper();

    const storage = await GoogleDriveWalletProvider.createStorageProvider();
    const session = state.beekeeper!.createSession(Math.random().toString());
    const chain = await GoogleDriveWalletProvider.getChain();

    const publicKeys: { [K in TRole]?: TPublicKey } = {};
    const roles: TRole[] = ['posting', 'active', 'owner', 'memo'];

    // Create providers for each role using ExternalSignatureProvider.createWalletFor
    for (const role of roles) {
      const privateKey = keys[role];
      if (!privateKey) continue;

      const walletName = `gdrive_${role}`;
      const wallet = await GoogleDriveWalletProvider.getOrCreateWallet(session, walletName);

      const provider = await ExternalSignatureProvider.createWalletFor(
        chain,
        WALLET_FILE_NAME,
        storage,
        wallet,
        role,
        accountName,
        privateKey
      );

      publicKeys[role] = provider.publicKey;
      state.sessions.set(role, wallet);
      state.providers.set(role, provider);
    }

    state.accountName = accountName;

    return publicKeys;
  }

  /**
   * Load wallet from Google Drive and create ExternalSignatureProvider for each role
   */
  public static async loadWallet (): Promise<{ accountName: string; roles: TRole[] }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    await GoogleDriveWalletProvider.initBeekeeper();

    // Create storage provider with token callback
    const storage = new GoogleStorageProvider(async () => {
      const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
      return response.token;
    });

    const chain = await GoogleDriveWalletProvider.getChain();

    if (!await storage.exists(WALLET_FILE_NAME))
      throw new Error('Wallet not found in Google Drive');

    const rawData = await storage.get(WALLET_FILE_NAME);

    let walletData: IWalletData;
    try {
      walletData = JSON.parse(rawData) as IWalletData;
    } catch (parseError) {
      console.error('Failed to parse wallet data:', parseError);
      console.error('Raw data:', rawData);
      throw new Error('Invalid wallet data format in Google Drive');
    }

    // Validate wallet has required fields
    if (!walletData.hive.account)
      throw new Error('Wallet data missing account name');

    // Validate wallet has at least one key
    const hasKeys = !!(walletData.hive.roleDefinitions.posting || walletData.hive.roleDefinitions.active || walletData.hive.roleDefinitions.owner || walletData.hive.roleDefinitions.memo);
    if (!hasKeys)
      throw new Error('Wallet data missing all private keys. Please recreate the wallet.');

    state.sessions.clear();
    state.providers.clear();

    const session = state.beekeeper!.createSession(Math.random().toString());
    const loadedRoles: TRole[] = [];
    const roles: TRole[] = ['posting', 'active', 'owner', 'memo'];

    for (const role of roles) {
      const roleData = walletData.hive.roleDefinitions[role];
      if (!roleData) continue;

      const walletName = `gdrive_${role}`;

      let wallet: IBeekeeperUnlockedWallet;

      if (session.hasWallet(walletName)) {
        const lockedWallet = session.openWallet(walletName);
        wallet = lockedWallet.unlocked ? lockedWallet.unlocked : lockedWallet.unlock(WALLET_PASSWORD);
      }
      else
        wallet = (await session.createWallet(walletName, WALLET_PASSWORD)).wallet;

      // Create ExternalSignatureProvider using the library
      const provider = await ExternalSignatureProvider.for(
        chain,
        WALLET_FILE_NAME,
        storage,
        wallet,
        role
      );

      state.sessions.set(role, wallet);
      state.providers.set(role, provider);
      loadedRoles.push(role);
    }

    state.accountName = walletData.hive.account;

    return {
      accountName: walletData.hive.account,
      roles: loadedRoles
    };
  }

  /**
   * Get wallet info without loading
   */
  public static async getWalletInfo (): Promise<{
    exists: boolean;
    accountName?: string;
    roles?: TRole[];
  }> {
    try {
      if (!await GoogleDriveWalletProvider.isAuthenticated())
        return { exists: false };

      // Create storage provider with token callback
      const storage = new GoogleStorageProvider(async () => {
        const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
        return response.token;
      });

      if (!await storage.exists(WALLET_FILE_NAME))
        return { exists: false };

      const rawData = await storage.get(WALLET_FILE_NAME);

      let walletData: IWalletData;
      try {
        walletData = JSON.parse(rawData) as IWalletData;
      } catch (parseError) {
        console.error('Failed to parse wallet data:', parseError);
        console.error('Raw data:', rawData);
        return { exists: false };
      }

      // Validate wallet has account name
      if (!walletData.hive.account) {
        console.warn('Wallet file exists but missing account name');
        return { exists: false };
      }

      const roles = (['posting', 'active', 'owner', 'memo'] as const).filter(
        role => !!walletData.hive.roleDefinitions[role]
      );

      // Wallet must have at least one key to be valid
      if (roles.length === 0) {
        console.warn('Wallet file exists but has no private keys');
        return { exists: false };
      }

      return {
        exists: true,
        accountName: walletData.hive.account,
        roles
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Delete wallet from Google Drive
   */
  public static async deleteWallet (): Promise<void> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    // Create storage provider with token callback
    const storage = new GoogleStorageProvider(async () => {
      const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
      return response.token;
    });

    if (await storage.exists(WALLET_FILE_NAME))
      await storage.delete(WALLET_FILE_NAME);

    state.sessions.clear();
    state.providers.clear();
    state.accountName = null;

    if (state.beekeeper) {
      await state.beekeeper.delete();
      state.beekeeper = null;
    }
  }

  /**
   * Logout and clear session
   */
  public static async logout (): Promise<void> {
    await $fetch('/api/auth/google/logout', { method: 'POST' });

    state.sessions.clear();
    state.providers.clear();
    state.accountName = null;

    if (state.beekeeper) {
      await state.beekeeper.delete();
      state.beekeeper = null;
    }
  }

  /**
   * Create provider instance for wallet.store.ts
   * This is called by wallet.store.ts createWalletFor()
   * Returns the ExternalSignatureProvider from wax-signers-external
   */
  public static async for (
    role: TRole
  ): Promise<ExternalSignatureProvider> {
    // If wallet is not loaded, try to load it
    if (!state.providers.has(role)) {
      await GoogleDriveWalletProvider.loadWallet();

      if (!state.providers.has(role))
        throw new Error(`Wallet for role '${role}' not available`);
    }

    const provider = state.providers.get(role);
    if (!provider)
      throw new Error(`Provider for role '${role}' not found`);

    return provider;
  }

  /**
   * Get public key for a role
   */
  public static getPublicKey (role: TRole): TPublicKey | undefined {
    const provider = state.providers.get(role);
    return provider?.publicKey;
  }

  /**
   * Check if wallet is loaded in memory
   */
  public static isWalletLoaded (): boolean {
    return state.providers.size > 0;
  }
}

export default GoogleDriveWalletProvider;
