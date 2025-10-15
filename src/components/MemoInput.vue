<script setup lang="ts">
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const handleInput = (event: string | number) => {
  emit('update:modelValue', String(event));
};
</script>

<template>
  <div class="space-y-2">
    <Label
      for="memo"
      class="text-sm font-medium text-foreground"
    >
      Memo (Optional)
    </Label>
    <Textarea
      id="memo"
      :model-value="modelValue"
      placeholder="Optional transfer memo or note"
      rows="3"
      :disabled="disabled"
      class="resize-none"
      @update:model-value="handleInput"
    />
    <p class="text-xs text-muted-foreground">
      Add an optional note for this transaction
    </p>
  </div>
</template>
