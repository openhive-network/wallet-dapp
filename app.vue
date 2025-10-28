<script setup lang="ts">
import { Toaster } from 'vue-sonner';

import ErrorDialog from '@/components/ErrorDialog.vue';
</script>

<template>
  <div id="shadcn-root">
    <div id="app-main">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <Toaster
        theme="dark"
        close-button
        rich-colors
      />
      <ErrorDialog />
    </div>
  </div>
</template>

<style scoped>
#shadcn-root {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  overflow: hidden;
  font-family: Verdana, sans-serif;
}
</style>
