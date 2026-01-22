<script setup lang="ts">
import MarkdownContent from '@/components/MarkdownContent.vue';

import privacyContent from '@/../content/privacy.md?raw';
</script>

<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <article class="leading-relaxed text-foreground">
      <header class="text-center mb-12">
        <h1 class="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p class="text-muted-foreground">Effective: Oct 7, 2019</p>
      </header>

      <MarkdownContent :content="privacyContent" />
    </article>
  </div>
</template>
