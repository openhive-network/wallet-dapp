<script setup lang="ts">
import { computed } from 'vue';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{
  modelValue: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenImage?: string;
  tokenNai?: string;
  precision?: number;
  disabled?: boolean;
  label?: string | null;
  showMaxButton?: boolean;
  maxAmount?: string;
  availableBalance?: string;
  validationError?: string;
  isValid?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'max'): void;
}>();

const placeholder = computed(() => {
  if (props.precision !== undefined)
    return `${props.precision} precision amount`;

  return `Amount in ${props.tokenSymbol || props.tokenName || 'tokens'}`;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const handleMax = () => {
  emit('max');
};

const displaySymbol = computed(() => props.tokenSymbol || props.tokenName?.slice(0, 3).toUpperCase() || '');
const avatarFallback = computed(() => displaySymbol.value.slice(0, 2).toUpperCase());
</script>

<template>
  <div class="space-y-2">
    <Label
      v-if="label !== null"
      for="token-amount"
      class="text-sm font-medium text-foreground"
    >
      {{ label || 'Amount' }}
    </Label>
    <div class="relative">
      <Input
        id="token-amount"
        :model-value="modelValue"
        type="text"
        inputmode="decimal"
        :placeholder="placeholder"
        :disabled="disabled"
        class="pr-24 transition-colors"
        :class="modelValue ? (isValid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500') : ''"
        @input="handleInput"
      />
      <!-- Token Symbol & Image on the right -->
      <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <Avatar
          v-if="tokenImage"
          class="h-6 w-6"
        >
          <AvatarImage
            :src="tokenImage"
            :alt="tokenSymbol || tokenName"
          />
          <AvatarFallback class="text-xs">
            {{ avatarFallback }}
          </AvatarFallback>
        </Avatar>
        <span class="text-sm text-muted-foreground font-medium">
          {{ displaySymbol }}
        </span>
      </div>
    </div>

    <!-- Available balance and MAX button -->
    <div
      v-if="availableBalance || showMaxButton"
      class="flex justify-between text-xs"
    >
      <span
        v-if="availableBalance"
        class="text-muted-foreground"
      >
        Available: {{ availableBalance }}
      </span>
      <button
        v-if="showMaxButton"
        type="button"
        class="text-primary hover:text-primary/80 font-medium"
        @click="handleMax"
      >
        MAX
      </button>
    </div>

    <!-- NAI info -->
    <p
      v-if="tokenNai"
      class="text-xs text-muted-foreground font-mono"
    >
      NAI: {{ tokenNai }}
    </p>

    <!-- Validation error -->
    <p
      v-if="modelValue && !isValid && validationError"
      class="text-xs text-red-500"
    >
      {{ validationError }}
    </p>
  </div>
</template>
