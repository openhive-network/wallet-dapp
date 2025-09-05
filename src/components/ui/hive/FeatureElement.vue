<script lang="ts" setup>
defineProps<{
  icon: string;
  text: string;
}>();
</script>

<template>
  <div class="flex items-center space-x-2">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 text-blue-500"
      viewBox="0 0 24 24"
    >
      <path
        style="fill: currentColor"
        :d="icon"
      />
    </svg>
    <span class="text-sm">{{ text }}</span>
  </div>
</template>
