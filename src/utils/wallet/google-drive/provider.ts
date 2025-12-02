import type { TPublicKey, TRole, TAccountName, AEncryptionProvider } from '@hiveio/wax';
import { createExternalWallet, type IExternalWalletContent, type IExternalWallet, type TStorageEncryptionCredentials } from '@hiveio/wax-signers-external';

import { useAccountNamePromptStore } from '@/stores/account-name-prompt.store';
import { useRecoveryPasswordStore, PasswordEntryCancelledError } from '@/stores/recovery-password.store';

const WALLET_FILE_NAME = 'hivebridge_wallet.json';
const LOCAL_ENCRYPTION_KEY_STORAGE = 'hivebridge_encryption_key_wif';

// Track if we're currently creating a new wallet
let pendingWalletCreationPassword: string | undefined;

export class RecoveryPasswordRequiredError extends Error {
  public constructor () {
    super('RECOVERY_PASSWORD_REQUIRED: Please provide your recovery password to access the wallet.');
    this.name = 'RecoveryPasswordRequiredError';
  }
}

export { AccountNameEntryCancelledError } from '@/stores/account-name-prompt.store';

const tokenProvider = async (): Promise<string> => {
  const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
  return response.token;
};

let walletInstance: IExternalWallet | null = null;

const getStoredEncryptionKey = (): string | undefined => {
  if (typeof window === 'undefined')
    return undefined;
  return localStorage.getItem(LOCAL_ENCRYPTION_KEY_STORAGE) ?? undefined;
};

const setStoredEncryptionKey = (keyWif: string): void => {
  if (typeof window === 'undefined')
    return;
  localStorage.setItem(LOCAL_ENCRYPTION_KEY_STORAGE, keyWif);
};

const clearStoredEncryptionKey = (): void => {
  if (typeof window === 'undefined')
    return;
  localStorage.removeItem(LOCAL_ENCRYPTION_KEY_STORAGE);
};

const storagePasswordProvider = async (missingStorageFile: boolean): Promise<TStorageEncryptionCredentials> => {
  // If we're creating a new wallet, use the pending password
  if (missingStorageFile && pendingWalletCreationPassword) {
    const password = pendingWalletCreationPassword;

    return { password };
  }

  // Check localStorage for cached encryption key
  const storedKey = getStoredEncryptionKey();

  if (storedKey) {
    // We have the encryption key stored - return it directly
    return { encryptionKey: storedKey };
  }

  // No key cached - prompt user via dialog
  if (!missingStorageFile) {
    // Wallet file exists but we don't have the encryption key cached
    const recoveryPasswordStore = useRecoveryPasswordStore();
    const password = await recoveryPasswordStore.requestPassword();

    // Don't store yet - we'll derive and store the key after wallet is loaded
    return { password };
  }

  // Missing file and no pending password - this shouldn't happen
  throw new Error('Recovery password must be set before creating a new wallet');
};

async function getWallet (): Promise<IExternalWallet> {
  if (!walletInstance) {
    const { getWax } = await import('@/stores/wax.store');
    const wax = await getWax();
    walletInstance = await createExternalWallet(
      wax,
      tokenProvider,
      storagePasswordProvider,
      WALLET_FILE_NAME
    );
  }

  return walletInstance;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GoogleDriveWalletProvider {
  private constructor () {}

  public static async isAuthenticated (): Promise<boolean> {
    try {
      const response = await $fetch<{ authenticated: boolean }>('/api/google-drive/oauth-status');
      return response.authenticated;
    } catch {
      return false;
    }
  }

  public static getLoginUrl (): string {
    return '/api/auth/google/login';
  }

  /**
   * Create a new wallet and save to Google Drive
   * @param accountName - The Hive account name
   * @param key - The private key for the role
   * @param role - The role for this key (posting, active, owner, memo)
   * @param recoveryPassword - User's recovery password for wallet encryption
   */
  public static async createWallet (
    accountName: string,
    key: string,
    role: TRole,
    recoveryPassword: string
  ): Promise<IExternalWalletContent> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    if (!recoveryPassword)
      throw new Error('Recovery password is required to create wallet');

    // Set pending password so callback can use it when creating new wallet
    pendingWalletCreationPassword = recoveryPassword;

    // Reset wallet instance to ensure fresh creation with new password
    if (walletInstance) {
      await walletInstance.close();
      walletInstance = null;
    }

    try {
      const wallet = await getWallet();
      const content = await wallet.createForHiveKey(role, accountName, key);

      // Extract and store the encryption key WIF for future automatic decryption
      const encryptionKeyWif = wallet.getEncryptionKeyWif();
      setStoredEncryptionKey(encryptionKeyWif);

      // Clear pending password after successfully storing the key
      pendingWalletCreationPassword = undefined;

      return content;
    } catch (error) {
      // Clear pending password on error
      pendingWalletCreationPassword = undefined;
      throw error;
    }
  }

  /**
   * Load wallet from Google Drive
   * @param accountName - The Hive account name to load wallet for
   */
  public static async loadWallet (accountName: TAccountName, role: TRole): Promise<{ accountName: string; role?: TRole }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    const wallet = await getWallet();
    const content = await wallet.loadForHiveKey(accountName, role);

    // Extract and store the encryption key WIF if not already stored
    if (!getStoredEncryptionKey()) {
      const encryptionKeyWif = wallet.getEncryptionKeyWif();
      setStoredEncryptionKey(encryptionKeyWif);
    }

    // Get all roles from enumerated keys
    const r = [...content.enumStoredHiveKeys(accountName, role)][0]?.role;

    return { accountName, role: r };
  }

  /**
   * Get wallet info without loading keys into memory
   * @param accountName - The Hive account name to check
   */
  public static async getWalletInfo (accountName: TAccountName, role: TRole): Promise<{
    exists: boolean;
    accountName?: string;
    role?: TRole;
  }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      return { exists: false };

    // Verify Google authentication with a test API call and check if wallet file exists
    try {
      const [_, walletFileCheck] = await Promise.all([
        $fetch('/api/google-drive/verify-auth'),
        $fetch<{ exists: boolean; fileId?: string | null }>('/api/google-drive/check-wallet-file')
      ]);

      // If wallet file doesn't exist, return early without trying to load it
      if (!walletFileCheck.exists)
        return { exists: false };
    } catch (error) {
      const err = error as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string } };

      // Check if it's an auth expired error
      if (err.statusCode === 401 || err.statusMessage === 'GOOGLE_AUTH_EXPIRED' || err.data?.statusMessage === 'GOOGLE_AUTH_EXPIRED') {
        // Throw error with specific code so UI can handle re-authentication
        const authError = new Error('Google authentication has expired. Please log in again.');
        (authError as Error & { code: string }).code = 'GOOGLE_AUTH_EXPIRED';
        throw authError;
      }

      // Re-throw other errors
      throw error;
    }

    // Wallet file exists, now try to load it
    const wallet = await getWallet();

    try {
      const content = await wallet.loadForHiveKey(accountName, role);
      const r = [...content.enumStoredHiveKeys(accountName, role)][0]?.role;

      return {
        exists: true,
        accountName,
        role: r
      };
    } catch (error) {
      // Re-throw PasswordEntryCancelledError so UI can handle it
      if (error instanceof PasswordEntryCancelledError)
        throw error;

      // Wallet file doesn't exist or account not found
      return { exists: false };
    }
  }

  /**
   * Get all configured roles for an account by probing each role individually
   * @param accountName - The Hive account name to check
   * @returns Array of configured roles
   */
  public static async getAllConfiguredRoles (accountName: TAccountName): Promise<TRole[]> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      return [];

    const allRoles: TRole[] = ['posting', 'active', 'owner', 'memo'];
    const configuredRoles: TRole[] = [];
    const wallet = await getWallet();

    for (const role of allRoles) {
      try {
        // Try to load this specific role
        await wallet.loadForHiveKey(accountName, role);
        configuredRoles.push(role);
      } catch (error) {
        // Re-throw PasswordEntryCancelledError so UI can handle it
        if (error instanceof PasswordEntryCancelledError)
          throw error;

        // Role doesn't exist in wallet - continue checking others
      }
    }

    return configuredRoles;
  }

  /**
   * Delete wallet from Google Drive
   * @param accountName - The Hive account name
   */
  // public static async deleteWallet (): Promise<void> {
  //   if (!await GoogleDriveWalletProvider.isAuthenticated())
  //     throw new Error('Not authenticated with Google');

  //   const wallet = await getWallet();
  //   await wallet.deleteStorageFile();
  //   // const content = await wallet.loadForHiveKey(accountName, role);
  //   // await content.clearContents(true);

  //   // Reset wallet instance after deletion
  //   await wallet.close();
  //   walletInstance = null;
  // }

  public static setEncryptionKey (keyWif: string): void {
    setStoredEncryptionKey(keyWif);
  }

  public static getEncryptionKey (): string | undefined {
    return getStoredEncryptionKey();
  }

  public static clearEncryptionKey (): void {
    clearStoredEncryptionKey();
  }

  public static hasEncryptionKey (): boolean {
    return !!getStoredEncryptionKey();
  }

  public static async logout (): Promise<void> {
    await $fetch('/api/auth/google/logout', { method: 'POST' });

    if (walletInstance) {
      await walletInstance.close();
      walletInstance = null;
    }

  }

  /**
   * Get wallet content for a specific role
   * Returns the IExternalWalletContent with the specified role active
   *
   * If the requested role is not available, falls back to the first available role.
   * Priority order: posting > active > owner > memo
   *
   * @param accountName - The Hive account name
   * @param role - The role to load (posting, active, owner, or memo)
   */
  public static async for (accountName: TAccountName, role: TRole): Promise<AEncryptionProvider> {
    const wallet = await getWallet();

    try {
      // Try to load the requested role
      return await wallet.loadForHiveKey(accountName, role) as unknown as  AEncryptionProvider;
    } catch {
      // Fall back to loading any available key for this account
      const content = await wallet.loadForHiveKey(accountName, role);
      const roles = [...content.enumStoredHiveKeys(accountName)];

      if (roles.length === 0)
        throw new Error('No wallet found or wallet has no keys');

      return content as unknown as AEncryptionProvider;
    }
  }

  /**
   * Add a new key for a specific role to the wallet
   * If the role already has a key, it will be overwritten
   *
   * @param accountName - The Hive account name
   * @param role - The role to add the key for (posting, active, owner, or memo)
   * @param privateKey - The private key to add
   * @returns Object with public key
   */
  public static async addKey (accountName: TAccountName, role: TRole, privateKey: string): Promise<{ publicKey: TPublicKey }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    const wallet = await getWallet();
    const content = await wallet.createForHiveKey(role, accountName, privateKey);

    // Extract and store the encryption key WIF if not already stored
    if (!getStoredEncryptionKey()) {
      const encryptionKeyWif = wallet.getEncryptionKeyWif();
      setStoredEncryptionKey(encryptionKeyWif);
    }

    // Get public key from enumerated keys
    const keyInfo = [...content.enumStoredHiveKeys(accountName, role)][0];
    if (!keyInfo)
      throw new Error('Failed to add key');

    return { publicKey: keyInfo.publicKey };
  }

  // TODO: Add Key removal once it is supported by the wax-signers-external library

  /**
   * Request account name from user via dialog
   * Used when checking wallet existence but no account name is stored in settings
   *
   * @returns Promise<string> - The account name entered by user
   * @throws AccountNameEntryCancelledError if user cancels
   */
  public static async requestAccountName (): Promise<string> {
    const accountNamePromptStore = useAccountNamePromptStore();
    return await accountNamePromptStore.requestAccountName();
  }
}

export default GoogleDriveWalletProvider;
