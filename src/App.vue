<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useSettingsStore, UsedWallet } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';
import AppSidebar from '@/components/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import ToggleSidebar from './components/sidebar/ToggleSidebar.vue';
import { Toaster } from 'vue-sonner';

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
onMounted(() => {
  settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
  if (hasUser.value)
    void walletStore.createWalletFor(settingsStore.settings);
});
const complete = (data: { account: string; wallet: UsedWallet }) => {
  hasUser.value = true;
  const settings = {
    account: data.account,
    wallet: data.wallet
  };
  settingsStore.setSettings(settings);
  void walletStore.createWalletFor(settings);
};
</script>

<template>
  <div id="shadcn-root">
    <div id="app-main">
      <SidebarProvider>
        <AppSidebar/>
        <!-- <AppHeader/> -->
        <main class="w-full">
          <ToggleSidebar class="m-3" />
          <RouterView />
        </main>
        <aside v-if="settingsStore.isLoaded && !hasUser" class="fixed inset-0 flex items-center justify-center z-20">
          <WalletOnboarding @complete="complete" />
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
