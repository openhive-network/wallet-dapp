<script setup lang="ts">
import { computed } from 'vue';

import type { AccountCreationStep } from '@/composables/useAccountCreationFlow';

const props = defineProps<{
  step?: AccountCreationStep;
  accountName: string;
  /** Method specific message for the `preparing` step */
  preparingMessage?: string;
}>();

const label = computed(() => {
  switch (props.step) {
  case 'creating':
    return `Registering @${props.accountName} on the Hive blockchain...`;
  case 'finalizing':
    return 'Finishing up and connecting your wallet...';
  default:
    return props.preparingMessage || 'Preparing the account keys...';
  }
});
</script>

<template>
  <div
    data-testid="create-account-progress"
    class="flex flex-col items-center justify-center py-10 space-y-4 text-center"
  >
    <div
      data-loading="spinner"
      class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"
    />
    <p class="text-sm font-medium">
      {{ label }}
    </p>
    <p class="text-xs text-muted-foreground max-w-xs">
      This can take up to half a minute while the transaction gets included in a block. Please keep this page open.
    </p>
  </div>
</template>
