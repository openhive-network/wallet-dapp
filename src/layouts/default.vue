<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { toast } from 'vue-sonner';

import AccountNamePromptDialog from '@/components/AccountNamePromptDialog.vue';
import HTMProvidePassword from '@/components/htm/HTMProvidePassword.vue';
import AppSidebar from '@/components/navigation';
import AppHeader from '@/components/navigation/AppHeader.vue';
import RecoveryPasswordDialog from '@/components/RecoveryPasswordDialog.vue';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AccountNameEntryCancelledError } from '@/stores/account-name-prompt.store';
import { PasswordEntryCancelledError } from '@/stores/recovery-password.store';
import type { UsedWallet } from '@/stores/settings.store';
import { useSettingsStore, UsedWallet as UsedWalletEnum } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import GoogleDriveWalletProvider from '@/utils/wallet/google-drive/provider';


const route = useRoute();

const hasTokenInRoute = computed(() => {
  return route.fullPath.includes('/tokens/');
});

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));

const hasUser = ref(false);
const isLoading = ref(true);
const preselectedWallet = ref<UsedWalletEnum | undefined>(undefined);
const prefilledAccountName = ref<string | undefined>(undefined);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();

const checkGoogleAuthAndLoadWallet = async () => {
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
              toast.info('Google Drive connected. Please create a wallet.');
              preselectedWallet.value = UsedWalletEnum.GOOGLE_DRIVE;
              prefilledAccountName.value = undefined;
              walletStore.openWalletSelectModal();
              return;
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
            const result = await GoogleDriveWalletProvider.loadWallet(savedAccount, 'posting');

            // Save settings
            const settings = {
              account: result.accountName,
              wallet: UsedWalletEnum.GOOGLE_DRIVE,
              googleDriveSync: settingsStore.settings.googleDriveSync || false,
              lastGoogleSyncTime: settingsStore.settings.lastGoogleSyncTime
            };

            settingsStore.setSettings(settings);
            hasUser.value = true;

            // Create wallet and load user data
            await walletStore.createWalletFor(settings, 'posting');
            await userStore.parseUserData(result.accountName);

            // Clear sessionStorage after successful load
            sessionStorage.removeItem('google_drive_account_name');
            toast.success(`Wallet loaded: ${result.accountName}`);
          } else {
            // No wallet found - open wallet creation modal with Google Drive preselected and account name
            toast.info('Google Drive connected. Please create a wallet.');
            preselectedWallet.value = UsedWalletEnum.GOOGLE_DRIVE;
            prefilledAccountName.value = savedAccount;
            // Keep in sessionStorage for error recovery
            sessionStorage.setItem('google_drive_account_name', savedAccount);
            walletStore.openWalletSelectModal();
          }
        }
      }
    } catch (error) {
      // Ignore if user cancelled password entry
      if (error instanceof PasswordEntryCancelledError)
        return;

      // Ignore if user cancelled account name entry
      if (error instanceof AccountNameEntryCancelledError)
        return;

      // eslint-disable-next-line no-console
      console.error('Failed to load Google Drive wallet:', error);
      toast.error('Failed to load wallet from Google Drive');
    }
  }
};

onMounted(async () => {
  isLoading.value = true;
  settingsStore.loadSettings();

  // Check for Google OAuth callback first
  await checkGoogleAuthAndLoadWallet();

  hasUser.value = settingsStore.settings.account !== undefined;
  if (hasUser.value) {
    walletStore.createWalletFor(settingsStore.settings, 'posting').then(() => {
      userStore.parseUserData(settingsStore.settings.account!).catch(error => {
        toast.error(`Failed to load user data: ${(error as Error).message}`);
      });
    });
  }

  isLoading.value = false;
});

const complete = async (data: { account: string; wallet: UsedWallet }) => {
  hasUser.value = true;

  const settings = {
    account: data.account,
    wallet: data.wallet,
    googleDriveSync: settingsStore.settings.googleDriveSync || false,
    lastGoogleSyncTime: settingsStore.settings.lastGoogleSyncTime
  };

  walletStore.closeWalletSelectModal();
  preselectedWallet.value = undefined;
  prefilledAccountName.value = undefined;
  sessionStorage.removeItem('google_drive_account_name');
  settingsStore.setSettings(settings);

  try {
    await walletStore.createWalletFor(settings, 'posting');

    await userStore.parseUserData(settingsStore.settings.account!);
  } catch (error) {
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
        :preselected-wallet="preselectedWallet"
        :prefilled-account-name="prefilledAccountName"
        @close="() => { walletStore.closeWalletSelectModal(); preselectedWallet = undefined; prefilledAccountName = undefined; }"
        @complete="complete"
      />
    </aside>
    <aside
      v-if="walletStore.isProvideWalletPasswordModalOpen"
      class="fixed inset-0 flex items-center justify-center z-20"
    >
      <HTMProvidePassword />
    </aside>
    <RecoveryPasswordDialog />
    <AccountNamePromptDialog />
  </SidebarProvider>
</template>
