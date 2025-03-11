<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useSettingsStore, UsedWallet } from '@/stores/settings.store';
import AppHeader from '@/components/AppHeader.vue';

const WalletOnboarding = defineAsyncComponent(() => import('@/components/onboarding/index'));

const hasUser = ref(true);
const settingsStore = useSettingsStore();
onMounted(() => {
  settingsStore.loadSettings();
  hasUser.value = settingsStore.settings.account !== undefined;
});
const complete = (data: { account: string; wallet: UsedWallet }) => {
  hasUser.value = true;
  settingsStore.setSettings({
    account: data.account,
    wallet: data.wallet
  });
};
</script>

<template>
  <div id="shadcn-root" class="dark">
    <div id="app-main">
      <AppHeader/>
      <main class="mt-[65px]">
        <RouterView />
      </main>
      <aside v-if="settingsStore.isLoaded && !hasUser" class="fixed inset-0 flex items-center justify-center z-20">
        <WalletOnboarding @complete="complete" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
#app-main {
  overflow-y: auto;
  height: 100%;
  width: 100%;
  background: url('/bg.svg') no-repeat center center fixed;
  background-size: cover;
}

#shadcn-root {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  height: 100vh;
  width: 100%;
  overflow: hidden;
  font-family: Verdana, sans-serif;
}
</style>
