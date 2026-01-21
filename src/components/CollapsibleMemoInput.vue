<script setup lang="ts">
import { mdiArrowUp, mdiArrowDown } from '@mdi/js';
import { ref, watch } from 'vue';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  rows?: number;
  // Auto-expand if memo has value (used when receiving from URL params)
  autoExpand?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isExpanded = ref(false);

// Auto-expand if memo has value and autoExpand is true
watch(() => props.modelValue, (newValue) => {
  if (props.autoExpand && newValue && newValue.trim())
    isExpanded.value = true;
}, { immediate: true });

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <Button
        data-testid="memo-toggle-btn"
        variant="ghost"
        size="sm"
        class="gap-2"
        @click="isExpanded = !isExpanded"
      >
        <svg
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="flex-shrink-0"
        >
          <path
            style="fill: currentColor"
            :d="isExpanded ? mdiArrowUp : mdiArrowDown"
          />
        </svg>
        {{ isExpanded ? 'Collapse' : 'Add Memo' }}
      </Button>
    </div>
    <div v-show="isExpanded" class="mt-2">
      <Textarea
        id="memo"
        data-testid="memo-textarea"
        :model-value="modelValue"
        :placeholder="placeholder || 'Memo...'"
        :rows="rows || 3"
        :readonly="readonly"
        :disabled="disabled"
        class="resize-none"
        @input="handleInput"
      />
    </div>
  </div>
</template>
