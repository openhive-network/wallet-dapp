<script setup lang="ts">
import GoogleDriveSync from '@/components/settings/GoogleDriveSync.vue';
</script>

<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6">
      Settings
    </h1>

    <div class="space-y-6">
      <!-- Google Drive Sync Section -->
      <GoogleDriveSync />

      <!-- Add more settings sections here -->
    </div>
  </div>
</template>
