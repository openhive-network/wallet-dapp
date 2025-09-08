<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AuthorizeDappCard from '@/components/utilcards/AuthorizeDappCard.vue';

const route = useRoute();

const app = computed(() => route.query.app as string);
const code = computed(() => route.query.code as string);
</script>

<template>
  <div class="p-8 flex justify-center">
    <AuthorizeDappCard
      v-if="typeof app === 'string' && typeof code === 'string'"
      :app="app"
      :code="code"
    />
  </div>
</template>
