<script setup lang="ts">
import { computed } from 'vue';

import AccountSwitcher from '@/components/navigation/AccountSwitcher.vue';
import ToggleSidebar from '@/components/navigation/ToggleSidebar.vue';
import { Button } from '@/components/ui/button';
import ThemeSwitch from '@/components/ui/theme-switch';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const tokensStore = useTokensStore();

const hasAnyAccount = computed(() =>
  (settingsStore.settings.account !== undefined && walletStore.hasWallet) ||
  tokensStore.wallet !== undefined
);

const route = useRoute();

const hasTokenInRoute = computed(() => {
  return route.fullPath.includes('/tokens/');
});
const hasL1WalletConnected = computed(() => walletStore.hasWallet && !walletStore.isL2Wallet);
</script>

<template>
  <header class="w-full h-[60px] bg-background">
    <div
      v-if="hasTokenInRoute && !hasL1WalletConnected"
      class="fixed bottom-0 z-12 select-none cursor-pointer dark:bg-blue-800 bg-blue-600 px-4 h-[20px] w-full md:w-[calc(100%-var(--sidebar-width))] flex flex-row justify-center items-center"
      @click="walletStore.openWalletSelectModal()"
    >
      <span class="text-xs font-semibold text-white/90">
        You are using L2 proxy account.
      </span>
    </div>
    <div class="fixed top-0 z-10 bg-background/60 backdrop-blur-sm px-4 h-[60px] border-b w-full md:w-[calc(100%-var(--sidebar-width))] flex items-center justify-between">
      <ToggleSidebar />
      <AccountSwitcher v-if="settingsStore.isLoaded && hasAnyAccount" />
      <div class="ml-auto inline-flex items-center space-x-4 md:space-x-6">
        <ThemeSwitch class="w-6 h-6" />
        <Button
          v-if="!hasAnyAccount"
          variant="outline"
          class="px-2 md:px-4 font-bold"
          @click="walletStore.openWalletSelectModal()"
        >
          <span>Connect</span>
        </Button>
      </div>
    </div>
  </header>
</template>
