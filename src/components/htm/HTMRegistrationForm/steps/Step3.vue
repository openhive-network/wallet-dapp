<script setup lang="ts">
import { mdiNumeric3Circle } from '@mdi/js';

import { HTM_REGISTRATION_KEY } from '@/components/htm/HTMRegistrationForm/types';
import type { HTMRegistrationContext } from '@/components/htm/HTMRegistrationForm/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Inject the registration context from parent
const { keysGenerated, hasConfirmedDownload } = inject<HTMRegistrationContext>(HTM_REGISTRATION_KEY)!;
</script>

<template>
  <div
    v-if="keysGenerated"
    class="space-y-4"
  >
    <div class="flex items-center space-x-2">
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: hsl(var(--primary))"
          :d="mdiNumeric3Circle"
        />
      </svg>
      <Label class="text-base font-semibold">Confirm & Register</Label>
    </div>

    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
      <div class="flex items-center space-x-2">
        <Checkbox
          id="confirm-download"
          v-model="hasConfirmedDownload"
          class="w-4 h-4"
        />
        <Label
          for="confirm-download"
          class="text-sm text-yellow-800 dark:text-yellow-200 cursor-pointer"
        >
          I confirm that I have <strong>downloaded and safely stored</strong> my HTM keys file
        </Label>
      </div>
    </div>
  </div>
</template>
