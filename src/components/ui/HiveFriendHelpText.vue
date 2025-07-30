<script setup lang="ts">
import { mdiHelpCircleOutline } from '@mdi/js';

import HiveFriendHelpTooltip from '@/components/ui/HiveFriendHelpTooltip.vue';
</script>

<template>
  <HiveFriendHelpTooltip>
    <template #default>
      <svg
        width="24"
        height="24"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: currentColor"
          :d="mdiHelpCircleOutline"
        />
      </svg>
      <span class="text-left">The generated link has all the info a Hive friend needs to create your account directly on the Hive blockchain</span>
    </template>
  </HiveFriendHelpTooltip>
</template>
