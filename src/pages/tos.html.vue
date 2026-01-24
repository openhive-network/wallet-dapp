<script setup lang="ts">
import MarkdownContent from '@/components/MarkdownContent.vue';

import termsContent from '@/../content/terms.md?raw';
</script>

<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <article class="leading-relaxed text-foreground">
      <header class="text-center mb-12">
        <h1 class="text-3xl font-bold mb-4">Terms of Service</h1>
        <p class="text-muted-foreground">Last Updated: January 22, 2026</p>
      </header>

      <MarkdownContent :content="termsContent" />
    </article>
  </div>
</template>
