import { toast } from 'vue-sonner';

import { PasswordEntryCancelledError, AccountNameEntryCancelledError } from '@/composables/usePromptDialog';
import { useSettingsStore, UsedWallet as UsedWalletEnum } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import GoogleDriveWalletProvider from '@/utils/wallet/google-drive/provider';

const userStore = useUserStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

interface GoogleAuthResult {
  hasUser: boolean;
  preselectedWallet?: UsedWalletEnum;
  prefilledAccountName?: string;
}

export default async function (): Promise<GoogleAuthResult> {
  // Default return values
  const result: GoogleAuthResult = {
    hasUser: false,
    preselectedWallet: undefined,
    prefilledAccountName: undefined
  };

  // Check if we just returned from Google OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const authStatus = urlParams.get('auth');

  if (authStatus === 'success') {
    // Remove the auth parameter from URL
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);

    try {
      // Reset user store to show loading state
      userStore.resetSettings();

      // Check if authenticated with Google
      const isAuthenticated = await GoogleDriveWalletProvider.isAuthenticated();

      if (isAuthenticated) {
        // Check if we have a saved account name from previous session
        let savedAccount = settingsStore.settings.account;

        // Check sessionStorage for account name from OAuth flow
        if (!savedAccount) {
          const sessionAccountName = sessionStorage.getItem('google_drive_account_name');
          if (sessionAccountName) {
            savedAccount = sessionAccountName;
            sessionStorage.removeItem('google_drive_account_name');
          }
        }

        // If still no saved account, ask user for account name ONCE
        if (!savedAccount) {
          try {
            savedAccount = await GoogleDriveWalletProvider.requestAccountName();
            // Store in sessionStorage in case of errors during wallet loading
            sessionStorage.setItem('google_drive_account_name', savedAccount);
          } catch (error) {
            // User cancelled account name entry - show onboarding with prefilled account
            if (error instanceof AccountNameEntryCancelledError) {
              result.preselectedWallet = UsedWalletEnum.GOOGLE_DRIVE;
              result.prefilledAccountName = undefined;
              walletStore.openWalletSelectModal();
              return result;
            }
            throw error;
          }
        }

        if (savedAccount) {
          // Try to load wallet for saved account
          const walletInfo = await GoogleDriveWalletProvider.getWalletInfo(savedAccount, 'posting');

          if (walletInfo.exists && walletInfo.accountName) {
            toast.success('Google Drive connected successfully');

            // Load the wallet
            const loadResult = await GoogleDriveWalletProvider.loadWallet(savedAccount, 'posting');

            // Save settings
            const settings = {
              account: loadResult.accountName,
              wallet: UsedWalletEnum.GOOGLE_DRIVE,
              googleDriveSync: settingsStore.settings.googleDriveSync || false,
              lastGoogleSyncTime: settingsStore.settings.lastGoogleSyncTime
            };

            settingsStore.setSettings(settings);
            result.hasUser = true;

            // Create wallet and load user data
            await walletStore.createWalletFor(settings, 'posting');
            await userStore.parseUserData(loadResult.accountName);

            // Clear sessionStorage after successful load
            sessionStorage.removeItem('google_drive_account_name');
            toast.success(`Wallet loaded: ${loadResult.accountName}`);
          } else {
            result.preselectedWallet = UsedWalletEnum.GOOGLE_DRIVE;
            result.prefilledAccountName = savedAccount;
            // Keep in sessionStorage for error recovery
            sessionStorage.setItem('google_drive_account_name', savedAccount);
            walletStore.openWalletSelectModal();
          }
        }
      }
    } catch (error) {
      // Ignore if user cancelled password entry
      if (error instanceof PasswordEntryCancelledError)
        return result;

      // Ignore if user cancelled account name entry
      if (error instanceof AccountNameEntryCancelledError)
        return result;

      toastError('Failed to load wallet from Google Drive', error);
    }
  }

  return result;
};
