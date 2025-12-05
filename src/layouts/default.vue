<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { toast } from 'vue-sonner';

import AccountNamePromptDialog from '@/components/AccountNamePromptDialog.vue';
import HTMProvidePassword from '@/components/htm/HTMProvidePassword.vue';
import AppSidebar from '@/components/navigation';
import AppHeader from '@/components/navigation/AppHeader.vue';
import RecoveryPasswordDialog from '@/components/RecoveryPasswordDialog.vue';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { UsedWallet , UsedWallet as UsedWalletEnum } from '@/stores/settings.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import checkGoogleAuthAndLoadWallet from '@/utils/wallet/google-drive/checkGoogleAuthAndLoadWallet';

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

onMounted(async () => {
  isLoading.value = true;
  settingsStore.loadSettings();

  // Check for Google OAuth callback first
  const googleAuthResult = await checkGoogleAuthAndLoadWallet();

  // Update state from Google auth result
  if (googleAuthResult.hasUser)
    hasUser.value = googleAuthResult.hasUser;
  else
    hasUser.value = settingsStore.settings.account !== undefined;


  if (googleAuthResult.preselectedWallet)
    preselectedWallet.value = googleAuthResult.preselectedWallet;


  if (googleAuthResult.prefilledAccountName)
    prefilledAccountName.value = googleAuthResult.prefilledAccountName;

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
