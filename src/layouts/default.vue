<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { toast } from 'vue-sonner';

import HTMProvidePassword from '@/components/htm/HTMProvidePassword.vue';
import AppSidebar from '@/components/navigation';
import AppHeader from '@/components/navigation/AppHeader.vue';
import { SidebarProvider } from '@/components/ui/sidebar';
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
        // Check if wallet exists on Google Drive
        const walletInfo = await GoogleDriveWalletProvider.getWalletInfo();

        if (walletInfo.exists && walletInfo.accountName) {
          toast.success('Google Drive connected successfully');

          // Load the wallet
          const result = await GoogleDriveWalletProvider.loadWallet();

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

          toast.success(`Wallet loaded: ${result.accountName}`);
        } else {
          // No wallet found - open wallet creation modal with Google Drive preselected
          toast.info('Google Drive connected. Please create a wallet.');
          preselectedWallet.value = UsedWalletEnum.GOOGLE_DRIVE;
          walletStore.openWalletSelectModal();
        }
      }
    } catch (error) {
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

  console.log('Complete called with data:', data);

  const settings = {
    account: data.account,
    wallet: data.wallet,
    googleDriveSync: settingsStore.settings.googleDriveSync || false,
    lastGoogleSyncTime: settingsStore.settings.lastGoogleSyncTime
  };

  console.log('Settings to save:', settings);

  walletStore.closeWalletSelectModal();
  preselectedWallet.value = undefined;
  settingsStore.setSettings(settings);

  console.log('Settings after setSettings:', settingsStore.settings);

  try {
    await walletStore.createWalletFor(settings, 'posting');

    console.log('About to parse user data for account:', settingsStore.settings.account);
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
        @close="() => { walletStore.closeWalletSelectModal(); preselectedWallet = undefined; }"
        @complete="complete"
      />
    </aside>
    <aside
      v-if="walletStore.isProvideWalletPasswordModalOpen"
      class="fixed inset-0 flex items-center justify-center z-20"
    >
      <HTMProvidePassword />
    </aside>
  </SidebarProvider>
</template>
