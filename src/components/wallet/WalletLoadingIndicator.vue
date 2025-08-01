<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean;
  message?: string;
}>();

const defaultMessage = props.message || 'Processing...';
</script>

<template>
  <div
    v-if="isLoading"
    class="flex items-center justify-center py-8"
  >
    <div class="flex items-center space-x-2">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      <span class="text-sm">{{ defaultMessage }}</span>
    </div>
  </div>
</template>
