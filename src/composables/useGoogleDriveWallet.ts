import type { TPublicKey, TRole } from '@hiveio/wax';

import GoogleDriveWalletProvider from '@/utils/wallet/google-drive/provider';

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
    keys: {
      posting?: string;
      active?: string;
      owner?: string;
      memo?: string;
    }
  ): Promise<{ [K in TRole]?: TPublicKey }> => {
    return await GoogleDriveWalletProvider.createWallet(accountName, keys);
  };

  const loadWallet = async (): Promise<{ accountName: string; roles: TRole[] }> => {
    return await GoogleDriveWalletProvider.loadWallet();
  };

  const getWalletInfo = async (): Promise<{
    exists: boolean;
    accountName?: string;
    roles?: TRole[];
  }> => {
    return await GoogleDriveWalletProvider.getWalletInfo();
  };

  const deleteWallet = async (): Promise<void> => {
    await GoogleDriveWalletProvider.deleteWallet();
  };

  const logout = async (): Promise<void> => {
    await GoogleDriveWalletProvider.logout();
  };

  const addKey = async (role: TRole, privateKey: string): Promise<TPublicKey> => {
    return await GoogleDriveWalletProvider.addKey(role, privateKey);
  };

  const removeKey = async (role: TRole): Promise<void> => {
    await GoogleDriveWalletProvider.removeKey(role);
  };

  return {
    // State getters
    get isAuthenticated () {
      return checkAuth();
    },
    get loginUrl () {
      return GoogleDriveWalletProvider.getLoginUrl();
    },

    // Methods
    checkAuth,
    createWallet,
    loadWallet,
    getWalletInfo,
    deleteWallet,
    logout,
    addKey,
    removeKey
  };
}
