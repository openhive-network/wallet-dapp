<script setup lang="ts">
import { computed } from 'vue';

import AccountBalanceCard from '@/components/utilcards/AccountBalanceCard.vue';
import AccountDetails from '@/components/utilcards/AccountDetailsCard.vue';
import ConnectWalletCard from '@/components/utilcards/ConnectWalletCard.vue';
import WalletLockedCard from '@/components/utilcards/WalletLockedCard.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
      <template v-if="hasUser && walletStore.hasWallet">
        <AccountDetails />
        <AccountBalanceCard />
      </template>
      <WalletLockedCard v-else-if="hasUser" />
      <ConnectWalletCard v-else />
    </div>
  </div>
</template>
