<script setup lang="ts">
import { computed } from 'vue';

import AccountBalanceCard from '@/components/utilcards/AccountBalanceCard.vue';
import AccountDetails from '@/components/utilcards/AccountDetailsCard.vue';
import ConnectWalletCard from '@/components/utilcards/ConnectWalletCard.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';

const settingsStore = useSettingsStore();
const userStore = useUserStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined && userStore.isReady);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div
      v-if="hasUser"
      class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
    >
      <AccountDetails />
      <AccountBalanceCard />
    </div>
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
    >
      <ConnectWalletCard />
    </div>
  </div>
</template>
