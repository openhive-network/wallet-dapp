<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { toast } from 'vue-sonner';

import HTMProvidePassword from '@/components/htm/HTMProvidePassword.vue';
import AppSidebar from '@/components/navigation';
import AppHeader from '@/components/navigation/AppHeader.vue';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { UsedWallet } from '@/stores/settings.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';


const route = useRoute();

const hasTokenInRoute = computed(() => {
  return route.fullPath.includes('/tokens/');
});

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();
onMounted(async () => {
  settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
  if (hasUser.value) {
    walletStore.createWalletFor(settingsStore.settings, 'posting').then(() => {
      userStore.parseUserData(settingsStore.settings.account!).catch(error => {
        toast.error(`Failed to load user data: ${(error as Error).message}`);
      });
    });
  }
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
  </SidebarProvider>
</template>
