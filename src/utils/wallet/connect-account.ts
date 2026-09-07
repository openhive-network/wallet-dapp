import type { TRole } from '@hiveio/wax';

import { useSettingsStore, type UsedWallet } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';

/** Persists the account/wallet pair in settings, instantiates the wallet and loads the user data */
export const connectAccountWithWallet = async (account: string, wallet: UsedWallet, role: TRole = 'posting'): Promise<void> => {
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const userStore = useUserStore();

  settingsStore.settings.account = account;
  settingsStore.settings.wallet = wallet;
  settingsStore.saveSettings();

  await walletStore.createWalletFor(settingsStore.settings, role);
  await userStore.parseUserData(account);
};
