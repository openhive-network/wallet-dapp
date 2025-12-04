import { toast } from 'vue-sonner';

import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const AUTO_LOGIN_PASSWORD_KEY = 'htm_random_password';

const isClient = (): boolean => typeof window !== 'undefined';

const getLocalStorageItem = (key: string): string | null => {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const removeLocalStorageItem = (key: string): void => {
  if (!isClient()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Silent fail
  }
};



/**
 * Check if auto-login is available
 * Auto-login is available when:
 * 1. Running on client side
 * 2. A random password exists in localStorage (user registered with encryptKeys disabled)
 * 3. An HTM wallet exists
 * 4. User is not already logged in
 */
export const canAutoLogin = async (): Promise<boolean> => {
  if (!isClient()) return false;

  const autoPassword = getLocalStorageItem(AUTO_LOGIN_PASSWORD_KEY);
  if (!autoPassword) return false;

  if (CTokensProvider.isLoggedIn()) return false;

  try {
    return await CTokensProvider.hasWallet();
  } catch {
    return false;
  }
};

/**
 * Perform auto-login using the stored random password
 * Returns true if successful, false otherwise
 */
export const performAutoLogin = async (): Promise<boolean> => {
  if (!isClient()) return false;

  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const tokensStore = useTokensStore();
  const userStore = useUserStore();

  try {
    const autoPassword = getLocalStorageItem(AUTO_LOGIN_PASSWORD_KEY);
    if (!autoPassword) return false;

    const hasWallet = await CTokensProvider.hasWallet();
    if (!hasWallet) return false;

    await CTokensProvider.login(autoPassword);

    const wax = await getWax();
    const operationalKey = tokensStore.getUserPublicKey();

    if (!operationalKey)
      throw new Error('Failed to get operational key after auto-login');


    // Check if user already has L1 wallet connected
    if (walletStore.wallet !== undefined && !walletStore.isL2Wallet) {
      // Already logged in using L1 wallet, just add HTM layer
      await tokensStore.reset(await CTokensProvider.for(wax, 'posting'));
      toast.success('HTM wallet auto-connected!', {
        description: 'Your HTM account is now ready to use'
      });
      return true;
    }

    await walletStore.createWalletFor(settingsStore.settings, 'posting');
    await userStore.parseUserData(operationalKey);
    await tokensStore.getCurrentUserMetadata();

    toast.success('Automatically logged in!', {
      description: 'Welcome back to your HTM account'
    });

    return true;
  } catch (error) {
    // Silent fail for auto-login - don't annoy users with errors
    toastError('Auto-Login Failed', error);
    return false;
  }
};

/**
 * Check if the current wallet is using auto-login (random password)
 */
export const isUsingAutoLogin = (): boolean => {
  if (!isClient()) return false;
  const autoPassword = getLocalStorageItem(AUTO_LOGIN_PASSWORD_KEY);
  return !!autoPassword;
};

/**
 * Clear the auto-login password (when user wants to switch to manual password)
 */
export const clearAutoLoginPassword = (): void => {
  removeLocalStorageItem(AUTO_LOGIN_PASSWORD_KEY);
};
