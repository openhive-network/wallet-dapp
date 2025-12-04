<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';

import TokenCreationForm from '@/components/htm/tokens/TokenCreationForm.vue';
import { Button } from '@/components/ui/button';

definePageMeta({
  layout: 'htm'
});
</script>

<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <NuxtLink to="/tokens/list" class="keychainify-checked">
          <Button
            variant="ghost"
            size="sm"
            class="gap-2 hover:bg-accent"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="flex-shrink-0"
            >
              <path
                style="fill: currentColor"
                :d="mdiArrowLeft"
              />
            </svg>
            Back to Tokens List
          </Button>
        </NuxtLink>
      </div>

      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold tracking-tight">
          Create Custom Token
        </h1>
        <p class="text-muted-foreground">
          Create your own custom token on the Hive Token Machine
        </p>
      </div>

      <!-- Token Creation Form -->
      <TokenCreationForm />
    </div>
  </div>
</template>
