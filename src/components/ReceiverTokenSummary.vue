<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  receiverName?: string;
  receiverKey?: string;
  receiverAvatar?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  receiverName: '',
  receiverKey: '',
  receiverAvatar: '',
  label: 'Receiver'
});

const receiverAvatarLetter = computed(() => {
  if (props.receiverName)
    return props.receiverName.trim().charAt(0).toUpperCase();

  return '?';
});

const receiverShortKey = computed(() => {
  if (!props.receiverKey) return '';
  return `STM${props.receiverKey.slice(3, 9)}...${props.receiverKey.slice(-6)}`;
});
</script>

<template>
  <div>
    <span class="text-sm font-medium text-foreground">
      {{ label }}
    </span>
    <div class="flex items-center gap-3 min-w-0 mt-2">
      <div
        v-if="receiverAvatar"
        class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted"
      >
        <img
          :src="receiverAvatar"
          :alt="receiverName"
          class="w-full h-full object-cover"
        >
      </div>
      <div
        v-else
        class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0"
      >
        {{ receiverAvatarLetter }}
      </div>
      <div class="flex flex-col min-w-0">
        <div class="text-sm font-bold truncate">
          {{ receiverName || 'Unknown' }}
        </div>
        <div class="text-xs text-muted-foreground truncate">
          {{ receiverShortKey }}
        </div>
      </div>
    </div>
  </div>
</template>
