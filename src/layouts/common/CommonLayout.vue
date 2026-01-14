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

const route = useRoute();

const hasTokenInRoute = computed(() => {
  return route.fullPath.includes('/tokens/');
});

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));
const HTMProvidePassword = defineAsyncComponent(() => import('@/components/htm/HTMProvidePassword.vue'));
const GoogleDriveConnect = defineAsyncComponent(() => import('@/components/onboarding/wallets/google-drive/GoogleDriveConnect.vue'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();
const favoritesStore = useFavoritesStore();

// Google Drive wallet dialog state
const showGoogleDriveWalletDialog = ref(false);
const isCheckingGoogleDriveWallet = ref(false);

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
  settingsStore.settings.account = accountName;
  settingsStore.settings.wallet = UsedWallet.GOOGLE_DRIVE;
  settingsStore.saveSettings();
  toast.success(`Wallet created for @${accountName}`);

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

onMounted(() => {
  settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
  favoritesStore.loadFromStorage();
  if (hasUser.value) {
    walletStore.createWalletFor(settingsStore.settings, 'posting').then(() => {
      userStore.parseUserData(settingsStore.settings.account!).catch(error => {
        toastError('Failed to load user data', error);
      });
    });
  }

  // Check if Google Drive wallet dialog should be shown
  checkGoogleDriveWalletNeeded();
});

// Also check when auth state changes (e.g., after OAuth callback)
watch(() => settingsStore.isGoogleAuthenticated, (isAuth) => {
  if (isAuth)
    checkGoogleDriveWalletNeeded();
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
  </SidebarProvider>
</template>
