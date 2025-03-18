<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useSettingsStore, UsedWallet } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';
import AppSidebar from '@/components/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import ToggleSidebar from './components/sidebar/ToggleSidebar.vue';
import { Toaster } from 'vue-sonner';
import { useUserStore } from '@/stores/user.store';
import { getWax } from '@/stores/wax.store';
import AppHeader from '@/components/AppHeader.vue';

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const userStore = useUserStore();
onMounted(async() => {
  settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
  if (hasUser.value) {
    void walletStore.createWalletFor(settingsStore.settings);
    const wax = await getWax();
    const { accounts: [ account ] } = await wax.api.database_api.find_accounts({ accounts: [ settingsStore.settings.account! ], delayed_votes_active: false });
    void userStore.setUserData(account);
  }
});
const complete = async(data: { account: string; wallet: UsedWallet }) => {
  hasUser.value = true;
  const settings = {
    account: data.account,
    wallet: data.wallet
  };
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
        <AppSidebar/>
        <!-- <AppHeader/> -->
        <main class="w-full bg-background">
          <ToggleSidebar class="m-3" />
          <RouterView />
        </main>
        <aside v-if="walletStore.isWalletSelectModalOpen" class="fixed inset-0 flex items-center justify-center z-20">
          <WalletOnboarding @close="walletStore.closeWalletSelectModal()" @complete="complete" />
        </aside>
      </SidebarProvider>
      <Toaster theme="dark" closeButton richColors />
    </div>
  </div>
</template>

<style scoped>
#app-main {
  overflow-y: auto;
  background: url('/bg.svg') no-repeat center center fixed;
  background-size: cover;
}

#shadcn-root {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  overflow: hidden;
  font-family: Verdana, sans-serif;
}
</style>
