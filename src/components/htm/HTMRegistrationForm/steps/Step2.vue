<script lang="ts" setup>
import { mdiNumeric2Circle, mdiRefresh, mdiDownload } from '@mdi/js';

import { HTM_REGISTRATION_KEY } from '@/components/htm/HTMRegistrationForm/types';
import type { HTMRegistrationContext } from '@/components/htm/HTMRegistrationForm/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Inject the registration context from parent
const {
  generatedKeys,
  keysGenerated,
  isLoading,
  isBasicInfoValid,
  generateAndDownloadKeys,
  downloadKeysFile,
  resetProcess
} = inject<HTMRegistrationContext>(HTM_REGISTRATION_KEY)!;
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <svg
          width="18"
          height="18"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: hsl(var(--primary))"
            :d="mdiNumeric2Circle"
          />
        </svg>
        <Label class="text-base font-semibold">HTM Keys Generation</Label>
      </div>
      <Button
        v-if="keysGenerated"
        variant="ghost"
        size="sm"
        class="text-gray-400"
        type="button"
        @click="resetProcess"
      >
        <svg
          width="14"
          height="14"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mr-1"
        >
          <path
            style="fill: currentColor"
            :d="mdiRefresh"
          />
        </svg>
        Reset
      </Button>
    </div>

    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        HTM keys will be <strong>automatically generated</strong> for you. No need to manually enter keys. Simply click the button below to generate and download your secure keys.
      </p>
    </div>

    <Button
      type="button"
      :disabled="!isBasicInfoValid || isLoading"
      class="w-full"
      @click="keysGenerated ? downloadKeysFile() : generateAndDownloadKeys()"
    >
      <svg
        v-if="!isLoading"
        width="16"
        height="16"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="mr-2"
      >
        <path
          style="fill: currentColor"
          :d="keysGenerated ? mdiDownload : mdiNumeric2Circle"
        />
      </svg>
      <span v-if="isLoading">Generating...</span>
      <span v-else-if="keysGenerated">Download Keys File Again</span>
      <span v-else>Generate & Download HTM Keys</span>
    </Button>

    <!-- Show generated public keys (read-only) -->
    <div
      v-if="keysGenerated"
      class="space-y-3 mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
    >
      <h4 class="text-sm font-semibold">
        Generated Public Keys (Read-Only)
      </h4>
      <div class="space-y-2">
        <div>
          <Label class="text-xs text-muted-foreground">Operational Public Key</Label>
          <Input
            :default-value="generatedKeys.operationalPublicKey"
            readonly
            class="font-mono text-xs bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <Label class="text-xs text-muted-foreground">Management Public Key</Label>
          <Input
            :default-value="generatedKeys.managementPublicKey"
            readonly
            class="font-mono text-xs bg-white dark:bg-gray-800"
          />
        </div>
      </div>
    </div>
  </div>
</template>
