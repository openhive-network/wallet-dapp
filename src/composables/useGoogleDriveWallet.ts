import type { TAccountName, TPublicKey, TRole } from '@hiveio/wax';
import type { IExternalWalletContent } from '@hiveio/wax-signers-external';

import { AccountNameEntryCancelledError } from '@/stores/account-name-prompt.store';
import GoogleDriveWalletProvider, { RecoveryPasswordRequiredError } from '@/utils/wallet/google-drive/provider';

/**
 * Composable for Google Drive wallet operations
 * Wraps GoogleDriveWalletProvider for easy use in components
 */
export function useGoogleDriveWallet () {
  const checkAuth = async (): Promise<boolean> => {
    return await GoogleDriveWalletProvider.isAuthenticated();
  };

  const createWallet = async (
    accountName: string,
    key: string,
    role: TRole,
    recoveryPassword: string
  ): Promise<IExternalWalletContent> => {
    return await GoogleDriveWalletProvider.createWallet(accountName, key, role, recoveryPassword);
  };

  const loadWallet = async (accountName: TAccountName, role: TRole): Promise<{ accountName: string; role?: TRole }> => {
    return await GoogleDriveWalletProvider.loadWallet(accountName, role);
  };

  const getWalletInfo = async (accountName: TAccountName, role: TRole): Promise<{
    exists: boolean;
    accountName?: string;
    role?: TRole;
  }> => {
    return await GoogleDriveWalletProvider.getWalletInfo(accountName, role);
  };

  const getAllConfiguredRoles = async (accountName: TAccountName): Promise<TRole[]> => {
    return await GoogleDriveWalletProvider.getAllConfiguredRoles(accountName);
  };

  const getPublicKeyForRole = async (accountName: TAccountName, role: TRole): Promise<{ publicKey: TPublicKey } | null> => {
    return await GoogleDriveWalletProvider.getPublicKeyForRole(accountName, role);
  };

  const logout = async (): Promise<void> => {
    await GoogleDriveWalletProvider.logout();
  };

  const addKey = async (accountName: TAccountName, role: TRole, privateKey: string): Promise<{ publicKey: TPublicKey }> => {
    return await GoogleDriveWalletProvider.addKey(accountName, role, privateKey);
  };

  const removeKey = async (accountName: TAccountName, publicKey?: TPublicKey, role?: TRole): Promise<void> => {
    return await GoogleDriveWalletProvider.removeKey(accountName, publicKey, role);
  };

  const setEncryptionKey = (keyWif: string): void => {
    GoogleDriveWalletProvider.setEncryptionKey(keyWif);
  };

  const getEncryptionKey = (): string | undefined => {
    return GoogleDriveWalletProvider.getEncryptionKey();
  };

  const clearEncryptionKey = (): void => {
    GoogleDriveWalletProvider.clearEncryptionKey();
  };

  const hasEncryptionKey = (): boolean => {
    return GoogleDriveWalletProvider.hasEncryptionKey();
  };

  const requestAccountName = async (): Promise<string> => {
    return await GoogleDriveWalletProvider.requestAccountName();
  };

  return {
    // State getters
    get isAuthenticated () {
      return checkAuth();
    },
    getLoginUrl: (returnUrl?: string) => GoogleDriveWalletProvider.getLoginUrl(returnUrl),

    // Methods
    checkAuth,
    createWallet,
    loadWallet,
    getWalletInfo,
    getAllConfiguredRoles,
    getPublicKeyForRole,
    logout,
    addKey,
    removeKey,
    setEncryptionKey,
    getEncryptionKey,
    clearEncryptionKey,
    hasEncryptionKey,
    requestAccountName,

    // Errors
    RecoveryPasswordRequiredError,
    AccountNameEntryCancelledError
  };
}
