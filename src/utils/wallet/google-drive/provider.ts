import type { TPublicKey, TRole, TAccountName, AEncryptionProvider } from '@hiveio/wax';
import { createExternalWallet, WaxExternalSignatureProviderError, type IExternalWalletContent, type IExternalWalletCustomKeyInfo, type IExternalWallet, type TStorageEncryptionCredentials } from '@hiveio/wax-signers-external';

import { useAccountNamePromptDialog, useRecoveryPasswordDialog, PasswordEntryCancelledError } from '@/composables/usePromptDialog';

const WALLET_FILE_NAME = 'hivebridge_wallet.json';
const LOCAL_ENCRYPTION_KEY_STORAGE = 'hivebridge_encryption_key_wif';

const STORED_PASSWORD_MISMATCH_NOTICE = 'The saved password no longer matches the wallet stored on Google Drive (it may have been recreated with a different password). Please enter the current recovery password.';
const INVALID_PASSWORD_NOTICE = 'Invalid recovery password. Please try again.';

// Track if we're currently creating a new wallet
let pendingWalletCreationPassword: string | undefined;
// Explanation shown on the next recovery password prompt (why the previous credentials were rejected)
let recoveryPasswordNotice: string | undefined;
// Whether the current wallet instance was unlocked with the key cached on this device rather than a typed password
let unlockedWithStoredKey = false;

export class RecoveryPasswordRequiredError extends Error {
  public constructor () {
    super('RECOVERY_PASSWORD_REQUIRED: Please provide your recovery password to access the wallet.');
    this.name = 'RecoveryPasswordRequiredError';
  }
}

export class EmptyWalletError extends Error {
  public constructor () {
    super('No wallet found or wallet has no keys');
    this.name = 'EmptyWalletError';
  }
}

export class AccountNotInWalletError extends Error {
  public readonly availableAccounts: string[];

  public constructor (requestedAccount: string, availableAccounts: string[]) {
    super(`No keys found for @${requestedAccount}`);
    this.name = 'AccountNotInWalletError';
    this.availableAccounts = availableAccounts;
  }
}

const tokenProvider = async (): Promise<string> => {
  const response = await $fetch<{ success: boolean; token: string }>('/api/google-drive/token');
  return response.token;
};

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

const isWalletError = (error: unknown, code: 'DECRYPTION_FAILED' | 'KEY_NOT_FOUND'): boolean =>
  error instanceof WaxExternalSignatureProviderError && error.code === code;

const storagePasswordProvider = async (missingStorageFile: boolean): Promise<TStorageEncryptionCredentials> => {
  unlockedWithStoredKey = false;

  // If we're creating a new wallet, use the pending password
  if (missingStorageFile && pendingWalletCreationPassword)
    return { password: pendingWalletCreationPassword };

  // Check localStorage for cached encryption key
  const storedKey = getStoredEncryptionKey();

  if (storedKey) {
    unlockedWithStoredKey = true;
    return { encryptionKey: storedKey };
  }

  // Missing file and no pending password - this shouldn't happen
  if (missingStorageFile)
    throw new Error('Recovery password must be set before creating a new wallet');

  // Wallet file exists but we don't have the encryption key cached - prompt user via dialog
  const notice = recoveryPasswordNotice;
  recoveryPasswordNotice = undefined;
  const password = await useRecoveryPasswordDialog().request(notice);

  // Don't store yet - the derived key is cached once it has successfully decrypted the wallet
  return { password };
};

let walletInstance: IExternalWallet | null = null;
let walletInstanceCreation: Promise<IExternalWallet> | null = null;

const createWalletInstance = async (): Promise<IExternalWallet> => {
  const { getWax } = await import('@/stores/wax.store');
  const wax = await getWax();

  return await createExternalWallet(wax, tokenProvider, storagePasswordProvider, WALLET_FILE_NAME);
};

// Concurrent callers share a single creation so the recovery password is requested only once
const getWallet = async (): Promise<IExternalWallet> => {
  if (walletInstance)
    return walletInstance;

  walletInstanceCreation ??= createWalletInstance()
    .then(instance => {
      walletInstance = instance;
      return instance;
    })
    .finally(() => {
      walletInstanceCreation = null;
    });

  return await walletInstanceCreation;
};

const discardWalletInstance = async (instance: IExternalWallet | null = walletInstance): Promise<void> => {
  if (!instance)
    return;

  if (walletInstance === instance)
    walletInstance = null;

  await instance.close();
};

// Cache the key once it has proven to decrypt the wallet, so the password is not asked for again on this device
const rememberEncryptionKey = (wallet: IExternalWallet): void => {
  const encryptionKeyWif = wallet.getEncryptionKeyWif();

  if (getStoredEncryptionKey() !== encryptionKeyWif)
    setStoredEncryptionKey(encryptionKeyWif);
};

/**
 * Runs an operation on the unlocked wallet.
 * When the credentials used to unlock it do not match the wallet file (e.g. the wallet was recreated with
 * a different password or a wrong password was typed), the stale credentials are dropped and the user is
 * asked for the recovery password again - until it matches or the prompt is cancelled.
 */
const withUnlockedWallet = async <T>(operation: (wallet: IExternalWallet) => Promise<T>): Promise<T> => {
  for (;;) {
    const wallet = await getWallet();

    try {
      const result = await operation(wallet);
      rememberEncryptionKey(wallet);

      return result;
    } catch (error) {
      if (!isWalletError(error, 'DECRYPTION_FAILED'))
        throw error;

      // A concurrent operation may have already replaced the instance - then just retry with the new one
      if (walletInstance === wallet) {
        recoveryPasswordNotice = unlockedWithStoredKey ? STORED_PASSWORD_MISMATCH_NOTICE : INVALID_PASSWORD_NOTICE;
        clearStoredEncryptionKey();
        await discardWalletInstance(wallet);
      }
    }
  }
};

// Loads the requested role or, when it is not stored, any role of the account; undefined when the account has no keys
const loadAnyHiveKey = async (wallet: IExternalWallet, accountName: TAccountName, role?: TRole): Promise<IExternalWalletContent | undefined> => {
  const rolesToTry: Array<TRole | undefined> = role ? [role, undefined] : [undefined];

  for (const candidate of rolesToTry) {
    try {
      return await wallet.loadForHiveKey(accountName, candidate);
    } catch (error) {
      if (!isWalletError(error, 'KEY_NOT_FOUND'))
        throw error;
    }
  }

  return undefined;
};

const missingAccountError = async (wallet: IExternalWallet, accountName: TAccountName): Promise<Error> => {
  const accounts = await wallet.enumStoredAccounts();
  // The wallet was decrypted even though the account is missing from it
  rememberEncryptionKey(wallet);

  const otherAccounts = accounts.filter(account => account !== accountName);

  return otherAccounts.length > 0 ? new AccountNotInWalletError(accountName, otherAccounts) : new EmptyWalletError();
};

// Validate the private key format before persisting it to Google Drive
const assertValidPrivateKey = async (privateKey: string): Promise<void> => {
  const { getWax } = await import('@/stores/wax.store');
  const wax = await getWax();

  try {
    wax.calculatePublicKey(privateKey);
  } catch {
    throw new Error('Invalid private key format. Please provide a valid Hive WIF private key.');
  }
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GoogleDriveWalletProvider {
  private constructor () {}

  public static async isAuthenticated (): Promise<boolean> {
    try {
      const response = await $fetch<{ authenticated: boolean }>('/api/auth/google/status');
      return response.authenticated;
    } catch {
      return false;
    }
  }

  public static getLoginUrl (returnUrl?: string): string {
    const url = '/api/auth/google/login';
    if (returnUrl)
      return `${url}?returnUrl=${encodeURIComponent(returnUrl)}`;
    return url;
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
    await discardWalletInstance();

    try {
      return await withUnlockedWallet(wallet => wallet.createForHiveKey(role, accountName, key));
    } finally {
      pendingWalletCreationPassword = undefined;
    }
  }

  /**
   * Load wallet from Google Drive
   * @param accountName - The Hive account name to load wallet for
   */
  public static async loadWallet (accountName: TAccountName, role?: TRole): Promise<{ accountName: string; role?: TRole }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    return await withUnlockedWallet(async wallet => {
      const content = await loadAnyHiveKey(wallet, accountName, role);

      if (!content)
        throw await missingAccountError(wallet, accountName);

      const keyInfo = [...content.enumStoredHiveKeys(accountName)][0];

      return { accountName, role: keyInfo?.role };
    });
  }

  /**
   * Get wallet info without loading keys into memory
   * @param accountName - Optional Hive account name (for backwards compat)
   */
  public static async getWalletInfo (accountName?: TAccountName): Promise<{
    exists: boolean;
    accountName?: string;
    accounts?: string[];
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

    // Wallet file exists - return this info immediately
    // Don't try to load it here, as it may require password prompt
    // The caller should handle loading separately if needed
    return {
      exists: true,
      accountName
    };
  }

  /**
   * Get all configured roles for an account
   * @param accountName - The Hive account name to check
   * @returns Array of configured roles
   */
  public static async getAllConfiguredRoles (accountName: TAccountName): Promise<TRole[]> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      return [];

    return await withUnlockedWallet(wallet => wallet.enumStoredRolesForAccount(accountName));
  }

  /**
   * Get public key for a specific role
   * @param accountName - The Hive account name
   * @param role - The role to get public key for
   * @returns Object with public key or null if not found
   */
  public static async getPublicKeyForRole (accountName: TAccountName, role: TRole): Promise<{ publicKey: TPublicKey } | null> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      return null;

    try {
      return await withUnlockedWallet(async wallet => {
        const content = await wallet.loadForHiveKey(accountName, role);
        const keyInfo = [...content.enumStoredHiveKeys(accountName, role)][0];

        return keyInfo ? { publicKey: keyInfo.publicKey } : null;
      });
    } catch (error) {
      // Re-throw PasswordEntryCancelledError so UI can handle it
      if (error instanceof PasswordEntryCancelledError)
        throw error;

      return null;
    }
  }

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

    await discardWalletInstance();

    // Update settings store to reflect logged out state
    const { useSettingsStore } = await import('@/stores/settings.store');
    const settingsStore = useSettingsStore();
    settingsStore.isGoogleAuthenticated = false;
    settingsStore.googleUser = null;
    settingsStore.settings.googleDriveSync = false;
    settingsStore.saveSettings();
  }

  /**
   * Get wallet content for a specific role
   * Returns the IExternalWalletContent with the specified role active
   *
   * If the requested role is not available, falls back to the first available role.
   *
   * @param accountName - The Hive account name
   * @param role - The role to load (posting, active, owner, or memo)
   */
  public static async for (accountName: TAccountName, role: TRole): Promise<AEncryptionProvider> {
    return await withUnlockedWallet(async wallet => {
      const content = await loadAnyHiveKey(wallet, accountName, role);

      if (!content)
        throw await missingAccountError(wallet, accountName);

      return content as unknown as AEncryptionProvider;
    });
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

    await assertValidPrivateKey(privateKey);

    return await withUnlockedWallet(async wallet => {
      const content = await wallet.createForHiveKey(role, accountName, privateKey);
      const keyInfo = [...content.enumStoredHiveKeys(accountName, role)][0];

      if (!keyInfo)
        throw new Error('Failed to add key');

      return { publicKey: keyInfo.publicKey };
    });
  }

  /**
   * Remove a key from the wallet
   * Can remove by role or by public key
   *
   * @param accountName - The Hive account name
   * @param publicKey - Public key of the key to remove (verified against the role when both are given)
   * @param role - Role whose key should be removed
   * @throws Error if not authenticated or key not found
   */
  public static async removeKey (accountName: TAccountName, publicKey?: TPublicKey, role?: TRole): Promise<void> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    await withUnlockedWallet(async wallet => {
      if (role !== undefined) {
        const content = await wallet.loadForHiveKey(accountName, role);
        const keyInfo = [...content.enumStoredHiveKeys(accountName, role)][0];

        if (!keyInfo)
          throw new Error(`No key found for ${accountName}@${role}`);

        if (publicKey !== undefined && keyInfo.publicKey !== publicKey)
          throw new Error(`Public key mismatch for ${accountName}@${role}`);

        await content.removeKey(keyInfo);
        return;
      }

      if (publicKey !== undefined) {
        // Any stored role of the account can be used to remove a key by its public key
        const content = await loadAnyHiveKey(wallet, accountName);

        if (!content)
          throw new Error(`Could not load wallet for account ${accountName} to remove key`);

        await content.removeKey(publicKey);
      }
    });
  }

  /**
   * Get all Hive accounts stored in the wallet
   * @returns Array of account names
   */
  public static async getStoredAccounts (): Promise<string[]> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      return [];

    return await withUnlockedWallet(wallet => wallet.enumStoredAccounts());
  }

  /**
   * Get all configured roles for a specific account
   * @param accountName - The Hive account name
   * @returns Array of configured roles
   */
  public static async getStoredRolesForAccount (accountName: TAccountName): Promise<TRole[]> {
    return await GoogleDriveWalletProvider.getAllConfiguredRoles(accountName);
  }

  /**
   * Add a custom general-purpose key to the wallet
   * @param alias - The key alias/identifier
   * @param privateKey - The private key
   * @param description - Optional description
   * @returns Object with public key
   */
  public static async addCustomKey (alias: string, privateKey: string, description?: string): Promise<{ publicKey: TPublicKey }> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    await assertValidPrivateKey(privateKey);

    return await withUnlockedWallet(async wallet => {
      const content = await wallet.createForCustomKey(alias, privateKey, description);
      const keyInfo = [...content.enumStoredCustomKeys()].find(k => k.customAlias === alias);

      if (!keyInfo)
        throw new Error('Failed to add custom key');

      return { publicKey: keyInfo.publicKey };
    });
  }

  /**
   * Get all custom keys stored in the wallet
   * @returns Array of custom key info (alias, publicKey, description)
   */
  public static async getAllCustomKeys (): Promise<IExternalWalletCustomKeyInfo[]> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      return [];

    return await withUnlockedWallet(wallet => wallet.enumStoredCustomKeys());
  }

  /**
   * Remove a custom key from the wallet
   * @param alias - The key alias to remove
   */
  public static async removeCustomKey (alias: string): Promise<void> {
    if (!await GoogleDriveWalletProvider.isAuthenticated())
      throw new Error('Not authenticated with Google');

    await withUnlockedWallet(async wallet => {
      const content = await wallet.loadForCustomKey(alias);
      const keyInfo = [...content.enumStoredCustomKeys()].find(k => k.customAlias === alias);

      if (!keyInfo)
        throw new Error(`Custom key '${alias}' not found`);

      await content.removeKey(keyInfo);
    });
  }

  /**
   * Load a custom key for signing
   * @param alias - The key alias to load
   * @returns Encryption provider for signing
   */
  public static async loadCustomKey (alias: string): Promise<AEncryptionProvider> {
    return await withUnlockedWallet(async wallet => await wallet.loadForCustomKey(alias) as unknown as AEncryptionProvider);
  }

  /**
   * Request account name from user via dialog
   * Used when checking wallet existence but no account name is stored in settings
   *
   * @returns Promise<string> - The account name entered by user
   * @throws AccountNameEntryCancelledError if user cancels
   */
  public static async requestAccountName (): Promise<string> {
    const accountNamePromptDialog = useAccountNamePromptDialog();
    return await accountNamePromptDialog.request();
  }
}

export default GoogleDriveWalletProvider;
