<script setup lang="ts">
import { computed } from 'vue';

import AccountDetails from '@/components/utilcards/AccountDetailsCard.vue';
import ConnectWalletCard from '@/components/utilcards/ConnectWalletCard.vue';
import { useSettingsStore } from '@/stores/settings.store';

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-8">
    <div v-if="hasUser">
      <AccountDetails />
    </div>
    <div v-else>
      <ConnectWalletCard />
    </div>
  </div>
</template>
