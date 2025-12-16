<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AuthorizeDappCard from '@/components/utilcards/AuthorizeDappCard.vue';
import AuthorizeGuideCard from '@/components/utilcards/AuthorizeGuideCard.vue';

const route = useRoute();

const app = computed(() => route.query.app as string);
const code = computed(() => route.query.code as string);
</script>

<template>
  <div class="p-4 sm:p-8 flex justify-center">
    <AuthorizeDappCard
      v-if="typeof app === 'string' && typeof code === 'string'"
      :app="app"
      :code="code"
    />
    <AuthorizeGuideCard v-else />
  </div>
</template>
