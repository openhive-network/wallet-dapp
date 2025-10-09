<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue';
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full text-center px-4">
    <h1 class="text-2xl font-bold mb-4">
      Register HTM Account
    </h1>
    <p class="mb-6">
      To manage your tokens, you need to register an HTM account. Click the button below to get started.
    </p>
    <Button
      size="lg"
      color="primary"
    >
      <!-- TODO: Actual registration / Allow to log into HTM account -->
      Register HTM Account
    </Button>
  </div>
</template>
