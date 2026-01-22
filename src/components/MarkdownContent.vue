<script setup lang="ts">
import { useMarkdown } from '@/composables/useMarkdown';

const props = defineProps<{
  content: string;
}>();

const { html } = useMarkdown(() => props.content);
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="prose dark:prose-invert max-w-none"
    data-testid="markdown-content"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
