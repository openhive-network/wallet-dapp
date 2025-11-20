import type { TPublicKey, TRole } from '@hiveio/wax';
import { ExternalSignatureProvider, type ExternalWalletSigner } from '@hiveio/wax-signers-external';

const WALLET_FILE_NAME = 'hivebridge_wallet.json';

/**
 * Token provider callback - fetches fresh OAuth token from server
 */
const tokenProvider = async (): Promise<string> => {
  const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
  return response.token;
};

let providerInstance: ExternalSignatureProvider | null = null;

/**
 * Get or create the ExternalSignatureProvider instance
 */
async function getProvider (): Promise<ExternalSignatureProvider> {
  if (!providerInstance) {
    const { getWax } = await import('@/stores/wax.store');

    const chain = await getWax();

    providerInstance = new ExternalSignatureProvider(chain, WALLET_FILE_NAME, tokenProvider);
  }

  return providerInstance;
}

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

  /**
   * Create a new wallet and save to Google Drive
   */
  public static async createWallet (
    accountName: string,
    keys: { posting?: string; active?: string; owner?: string; memo?: string }
  ): Promise<{ [K in TRole]?: TPublicKey }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    const provider = await getProvider();
    const publicKeys: { [K in TRole]?: TPublicKey } = {};
    const roles: TRole[] = ['posting', 'active', 'owner', 'memo'];

    for (const role of roles) {
      const privateKey = keys[role];
      if (!privateKey) continue;

      const signer = await provider.createWalletFor(role, accountName, privateKey);
      publicKeys[role] = signer.publicKey;
    }

    return publicKeys;
  }

  /**
   * Load wallet from Google Drive
   */
  public static async loadWallet (): Promise<{ accountName: string; roles: TRole[] }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    const provider = await getProvider();
    return await provider.loadWallet();
  }

  /**
   * Get wallet info without loading keys into memory
   */
  public static async getWalletInfo (): Promise<{
    exists: boolean;
    accountName?: string;
    roles?: TRole[];
  }> {
    try {
      if (!await GoogleDriveWalletProvider.isAuthenticated())
        return { exists: false };

      const provider = await getProvider();

      const exists = await provider.hasWallet();
      if (!exists)
        return { exists: false };

      const accountName = await provider.getAccountName();
      const loadResult = await provider.loadWallet();

      return {
        exists: true,
        accountName,
        roles: loadResult.roles
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

    const provider = await getProvider();
    await provider.deleteWallet();
    providerInstance = null;
  }

  /**
   * Logout and clear session
   */
  public static async logout (): Promise<void> {
    await $fetch('/api/auth/google/logout', { method: 'POST' });

    if (providerInstance) {
      await providerInstance.destroy();
      providerInstance = null;
    }
  }

  /**
   * Get provider for a specific role (switches active role)
   * This is called by wallet.store.ts createWalletFor()
   * Returns the ExternalWalletSigner with the specified role active
   *
   * If the requested role is not available, falls back to the first available role.
   * Priority order: posting > active > owner > memo
   */
  public static async for (role: TRole): Promise<ExternalWalletSigner> {
    const provider = await getProvider();

    // Check if the requested role exists
    const hasRequestedRole = await provider.hasRole(role);

    if (hasRequestedRole)
      return await provider.for(role);

    // Fall back to first available role
    const loadResult = await provider.loadWallet();

    if (!loadResult.roles || loadResult.roles.length === 0)
      throw new Error('No wallet found or wallet has no keys');

    const firstRole = loadResult.roles[0];
    if (!firstRole)
      throw new Error('No roles available in wallet');

    return await provider.for(firstRole);
  }



  /**
   * Add a new key for a specific role to the wallet
   * If the role already has a key, it will be overwritten
   *
   * @param role - The role to add the key for (posting, active, owner, or memo)
   * @param privateKey - The private key to add
   * @returns The public key corresponding to the added private key
   */
  public static async addKey (role: TRole, privateKey: string): Promise<TPublicKey> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    const provider = await getProvider();

    // Get current wallet account name
    const accountName = await provider.getAccountName();

    const signer = await provider.createWalletFor(role, accountName, privateKey);
    return signer.publicKey;
  }

  /**
   * Remove a key for a specific role from the wallet
   *
   * @param role - The role to remove (posting, active, owner, or memo)
   */
  public static async removeKey (role: TRole): Promise<void> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    const provider = await getProvider();
    await provider.removeKey(role);
  }
}

export default GoogleDriveWalletProvider;
