<script setup lang="ts">
import HTMTokenPreview from '@/components/htm/HTMTokenPreview.vue';
import type { CTokenDefinitionDisplay } from '@/stores/tokens.store';


interface Props {
  token: CTokenDefinitionDisplay;
}

defineProps<Props>();

</script>

<template>
  <HTMTokenPreview
    :token="token"
    :show-view-icon="true"
  />
</template>
