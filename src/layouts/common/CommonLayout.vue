<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent, watch } from 'vue';
import { toast } from 'vue-sonner';

import AppSidebar from '@/components/navigation';
import AppHeader from '@/components/navigation/AppHeader.vue';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useFavoritesStore } from '@/stores/favorites.store';
import { UsedWallet, useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import GoogleDriveWalletProvider, { EmptyWalletError, AccountNotInWalletError } from '@/utils/wallet/google-drive/provider';

const route = useRoute();

const hasTokenInRoute = computed(() => {
  return route.fullPath.includes('/tokens/');
});

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));
const HTMProvidePassword = defineAsyncComponent(() => import('@/components/htm/HTMProvidePassword.vue'));
const GoogleDriveConnect = defineAsyncComponent(() => import('@/components/onboarding/wallets/google-drive/GoogleDriveConnect.vue'));
const RecoveryPasswordDialog = defineAsyncComponent(() => import('@/components/RecoveryPasswordDialog.vue'));
const AccountNamePromptDialog = defineAsyncComponent(() => import('@/components/AccountNamePromptDialog.vue'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();
const favoritesStore = useFavoritesStore();

// Google Drive wallet dialog state
const showGoogleDriveWalletDialog = ref(false);
const isCheckingGoogleDriveWallet = ref(false);

/**
 * Handle Google OAuth callback - called when user returns from Google auth with ?auth=success
 * Prompts for account name if needed and loads the wallet
 */
const handleGoogleOAuthCallback = async () => {
  // Check if we just returned from Google OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const authStatus = urlParams.get('auth');

  if (authStatus !== 'success')
    return false;

  // Remove the auth parameter from URL
  const newUrl = window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);

  try {
    // Check if authenticated with Google
    await settingsStore.checkGoogleAuth();
    if (!settingsStore.isGoogleAuthenticated)
      return false;

    // Check if wallet file exists
    const response = await $fetch<{ exists: boolean }>('/api/google-drive/check-wallet-file');

    if (!response.exists) {
      // No wallet file - show create wallet dialog
      showGoogleDriveWalletDialog.value = true;
      return true;
    }

    // Wallet file exists - check if we have account name
    let accountName = settingsStore.settings.account;

    if (!accountName) {
      // Prompt for account name - don't save to settings yet, validate first via loadWallet
      try {
        accountName = await GoogleDriveWalletProvider.requestAccountName();
      } catch (_promptError) {
        // User cancelled - don't block app usage
        return true;
      }
    }

    // Try to load the wallet (will prompt for recovery password if needed)
    // loadWallet will automatically fallback to any available role if 'posting' is not found
    const loadingToastId = toast.loading('Loading wallet...');
    try {
      await GoogleDriveWalletProvider.loadWallet(accountName);

      // Sync all stored accounts so header dropdown shows immediately
      const storedAccounts = await GoogleDriveWalletProvider.getStoredAccounts();
      settingsStore.syncGoogleDriveAccounts(storedAccounts);

      // Update settings
      settingsStore.settings.account = accountName;
      settingsStore.settings.wallet = UsedWallet.GOOGLE_DRIVE;
      settingsStore.saveSettings();

      // Load user data
      hasUser.value = true;
      await walletStore.createWalletFor(settingsStore.settings, 'posting');
      await userStore.parseUserData(accountName);

      toast.success(`Wallet loaded for @${accountName}`, { id: loadingToastId });
    } catch (loadError) {
      toast.dismiss(loadingToastId);
      if (loadError instanceof AccountNotInWalletError || loadError instanceof EmptyWalletError) {
        // Account not found or wallet empty - show GoogleDriveConnect dialog
        // which has pick-account / add-keys UI built in
        sessionStorage.setItem('google_drive_account_name', accountName);
        showGoogleDriveWalletDialog.value = true;
      }
      // User cancelled password entry or other error - don't block app usage
    }

    return true;
  } catch (_error) {
    // Silently fail - don't block app usage
    return false;
  }
};

/**
 * Check if user is authenticated with Google but has no wallet file
 * If so, show the create wallet dialog
 */
const checkGoogleDriveWalletNeeded = async () => {
  isCheckingGoogleDriveWallet.value = true;
  try {
    // Check if authenticated with Google
    await settingsStore.checkGoogleAuth();
    if (!settingsStore.isGoogleAuthenticated)
      return;

    // Check if wallet file exists
    const response = await $fetch<{ exists: boolean }>('/api/google-drive/check-wallet-file');
    if (!response.exists)
      showGoogleDriveWalletDialog.value = true;
  } catch (_error) {
    // Silently fail - don't block app usage
  } finally {
    isCheckingGoogleDriveWallet.value = false;
  }
};

const handleGoogleDriveWalletCreated = async (accountName: string) => {
  showGoogleDriveWalletDialog.value = false;

  // Sync all stored accounts so header dropdown shows immediately
  try {
    const storedAccounts = await GoogleDriveWalletProvider.getStoredAccounts();
    settingsStore.syncGoogleDriveAccounts(storedAccounts);
  } catch { /* non-critical */ }

  settingsStore.settings.account = accountName;
  settingsStore.settings.wallet = UsedWallet.GOOGLE_DRIVE;
  settingsStore.saveSettings();
  hasUser.value = true;
  toast.success(`Wallet loaded for @${accountName}`);

  // Reload user data
  try {
    await walletStore.createWalletFor(settingsStore.settings, 'posting');
    await userStore.parseUserData(accountName);
  } catch (error) {
    toastError('Failed to load wallet', error);
  }
};

const handleGoogleDriveDialogClose = () => {
  showGoogleDriveWalletDialog.value = false;
};

onMounted(async () => {
  void settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
  favoritesStore.loadFromStorage();

  // First, check if this is an OAuth callback - handle it before anything else
  const wasOAuthCallback = await handleGoogleOAuthCallback();

  if (!wasOAuthCallback) {
    // Normal app load - not an OAuth callback
    if (hasUser.value) {
      walletStore.createWalletFor(settingsStore.settings, 'posting').then(() => {
        userStore.parseUserData(settingsStore.settings.account!).catch(error => {
          toastError('Failed to load user data', error);
        });
      }).catch(error => {
        if (error instanceof EmptyWalletError || error instanceof AccountNotInWalletError)
          toast.warning('Your wallet is empty. Please go to Settings to add keys.');
        else
          toastError('Failed to load wallet', error);

      });
    }

    // Check if Google Drive wallet dialog should be shown
    void checkGoogleDriveWalletNeeded();
  }
});

// Also check when auth state changes (e.g., after OAuth callback)
watch(() => settingsStore.isGoogleAuthenticated, (isAuth) => {
  if (isAuth)
    void checkGoogleDriveWalletNeeded();
});

const complete = async (data: { account: string; wallet: UsedWallet }) => {
  hasUser.value = true;
  const settings = {
    account: data.account,
    wallet: data.wallet
  };
  walletStore.closeWalletSelectModal();
  settingsStore.setSettings(settings);

  try {
    await walletStore.createWalletFor(settings, 'posting');

    await userStore.parseUserData(settingsStore.settings.account!);
  } catch (error) {
    if (error instanceof EmptyWalletError || error instanceof AccountNotInWalletError)
      toast.warning('Your wallet has no keys for this account. Please go to Settings to add keys.');
    else
      toastError('Failed to create wallet', error);

  }
};
</script>

<template>
  <SidebarProvider>
    <AppSidebar :force-token-view="hasTokenInRoute" />
    <div class="w-full">
      <AppHeader />
      <main class="w-full h-[calc(100%-60px)] bg-background">
        <slot />
      </main>
    </div>
    <aside
      v-if="walletStore.isWalletSelectModalOpen"
      class="fixed inset-0 flex items-center justify-center z-20"
    >
      <WalletOnboarding
        @close="walletStore.closeWalletSelectModal()"
        @complete="complete"
      />
    </aside>
    <aside
      v-if="walletStore.isProvideWalletPasswordModalOpen"
      class="fixed inset-0 flex items-center justify-center z-20"
    >
      <HTMProvidePassword />
    </aside>

    <!-- Google Drive Wallet Creation Dialog (global) -->
    <Dialog
      :open="showGoogleDriveWalletDialog"
      @update:open="(open: boolean) => !open && handleGoogleDriveDialogClose()"
    >
      <DialogContent class="sm:max-w-[500px] p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <GoogleDriveConnect
          @setaccount="handleGoogleDriveWalletCreated"
          @close="handleGoogleDriveDialogClose"
        />
      </DialogContent>
    </Dialog>

    <!-- Recovery Password Dialog (global) -->
    <RecoveryPasswordDialog />

    <!-- Account Name Prompt Dialog (global) -->
    <AccountNamePromptDialog />
  </SidebarProvider>
</template>
