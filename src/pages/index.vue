<script setup lang="ts">
import { computed } from 'vue';

import AccountDetails from '@/components/utilcards/AccountDetailsCard.vue';
import ConnectWalletCard from '@/components/utilcards/ConnectWalletCard.vue';
import { useSettingsStore } from '@/stores/settings.store';
import AccountBalanceCard from '@/components/utilcards/AccountBalanceCard.vue';

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);
</script>

<template>
  <div class="p-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" v-if="hasUser">
      <AccountDetails />
      <AccountBalanceCard />
    </div>
    <div v-else>
      <ConnectWalletCard />
    </div>
  </div>
</template>
