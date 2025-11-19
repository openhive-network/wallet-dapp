<script setup lang="ts">
import type { CTokenDefinitionDisplay } from '@/stores/tokens.store';

import HTMTokenPreview from '~/src/components/htm/HTMTokenPreview.vue';

interface Props {
  token: CTokenDefinitionDisplay;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [token: CTokenDefinitionDisplay];
}>();

// Handle card click
const handleClick = () => {
  emit('click', props.token);
};
</script>

<template>
  <HTMTokenPreview
    :token="token"
    :clickable="true"
    :show-view-icon="true"
    @click="handleClick"
  />
</template>
