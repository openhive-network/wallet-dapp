<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { Toaster } from 'vue-sonner';

import AppSidebar from '@/components/navigation';
import AppHeader from '@/components/navigation/AppHeader.vue';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { UsedWallet } from '@/stores/settings.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';

import ErrorDialog from './components/ErrorDialog.vue';

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();
onMounted(async () => {
  settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
  if (hasUser.value) {
    void walletStore.createWalletFor(settingsStore.settings);
    const wax = await getWax();
    const { accounts: [ account ] } = await wax.api.database_api.find_accounts({ accounts: [ settingsStore.settings.account! ], delayed_votes_active: false });
    void userStore.setUserData(account);
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
  void walletStore.createWalletFor(settings);
  const wax = await getWax();
  const { accounts: [ account ] } = await wax.api.database_api.find_accounts({ accounts: [ settingsStore.settings.account! ], delayed_votes_active: false });
  void userStore.setUserData(account);
};
</script>

<template>
  <div id="shadcn-root">
    <div id="app-main">
      <SidebarProvider>
        <AppSidebar />
        <div class="w-full">
          <AppHeader />
          <main class="w-full h-[calc(100%-60px)] bg-background">
            <RouterView />
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
      </SidebarProvider>
      <Toaster
        theme="dark"
        close-button
        rich-colors
      />
      <ErrorDialog />
    </div>
  </div>
</template>

<style scoped>
#shadcn-root {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  overflow: hidden;
  font-family: Verdana, sans-serif;
}
</style>
