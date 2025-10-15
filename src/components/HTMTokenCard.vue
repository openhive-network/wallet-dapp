<script setup lang="ts">
import HTMTokenPreview from '@/components/HTMTokenPreview.vue';
import type { CTokenDisplay } from '@/stores/tokens.store';

interface Props {
  token: CTokenDisplay;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [token: CTokenDisplay];
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
