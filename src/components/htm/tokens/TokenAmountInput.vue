<script setup lang="ts">
import { computed } from 'vue';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CTokenDisplayBase } from '@/stores/tokens.store';

const props = defineProps<{
  token: CTokenDisplayBase
  modelValue: string;
  valid: { isValid: boolean; error?: string };
  disabled?: boolean;
  availableBalance?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'max'): void;
}>();

const placeholder = computed(() => {
  if (props.token.precision !== undefined)
    return `${props.token.precision} precision amount`;

  return `Amount in ${props.token.symbol || props.token.name || 'tokens'}`;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const validateAmountPrecision = (amount: string, precision: number): { isValid: boolean; error?: string; parsedAmount?: string } => {
  try {
    const cleanAmount = amount.replace(/[,\s]/g, '');

    if (!/^\d*\.?\d*$/.test(cleanAmount))
      return { isValid: false, error: 'Amount must contain only digits and decimal point' };

    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount) || numAmount <= 0)
      return { isValid: false, error: 'Amount must be a positive number' };

    if (!isFinite(numAmount))
      return { isValid: false, error: 'Amount value is too large' };

    const decimalIndex = cleanAmount.indexOf('.');
    if (decimalIndex !== -1) {
      const decimalPlaces = cleanAmount.length - decimalIndex - 1;
      if (decimalPlaces > precision) {
        return {
          isValid: false,
          error: `Amount has too many decimal places. Maximum ${precision} decimal places allowed for this token.`
        };
      }
    }

    const multiplier = Math.pow(10, precision);
    const baseUnits = numAmount * multiplier;

    const MAX_SAFE_BASE_UNITS = Number.MAX_SAFE_INTEGER;
    if (baseUnits > MAX_SAFE_BASE_UNITS)
      return { isValid: false, error: 'Amount is too large and would cause overflow' };

    const roundedBaseUnits = Math.round(baseUnits);
    if (Math.abs(baseUnits - roundedBaseUnits) > 0.0001) {
      return {
        isValid: false,
        error: `Amount precision mismatch. Please use at most ${precision} decimal places.`
      };
    }

    return { isValid: true, parsedAmount: roundedBaseUnits.toString() };
  } catch (_error) {
    return { isValid: false, error: 'Invalid amount format' };
  }
};

const validationError = computed(() => {
  if (!props.modelValue)
    return { isValid: true, error: '' };

  if (!props.token)
    return { isValid: true, error: '' };

  return validateAmountPrecision(props.modelValue, props.token.precision || 0);
});

const handleMax = () => {
  emit('max');
};

const displaySymbol = computed(() => props.token.symbol || props.token.name?.slice(0, 3).toUpperCase() || '');
const avatarFallback = computed(() => displaySymbol.value.slice(0, 2).toUpperCase());
</script>

<template>
  <div class="space-y-2">
    <Label
      for="token-amount"
      class="text-sm font-medium text-foreground"
    >
      Amount
    </Label>
    <div class="relative">
      <Input
        id="token-amount"
        v-model:valid="validationError"
        :model-value="modelValue"
        type="text"
        inputmode="decimal"
        :placeholder="placeholder"
        :disabled="disabled"
        class="pr-24 transition-colors"
        :class="modelValue ? (validationError.error ? 'border-red-500 focus-visible:ring-red-500' : 'border-green-500 focus-visible:ring-green-500') : ''"
        @input="handleInput"
      />
      <!-- Token Symbol & Image on the right -->
      <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <Avatar
          v-if="token.image"
          class="h-6 w-6"
        >
          <AvatarImage
            :src="token.image"
            :alt="token.symbol || token.name"
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
      v-if="availableBalance"
      class="flex justify-between text-xs"
    >
      <span
        class="text-muted-foreground"
      >
        Available: {{ availableBalance }}
      </span>
      <button
        type="button"
        class="text-primary hover:text-primary/80 font-medium"
        @click="handleMax"
      >
        MAX
      </button>
    </div>

    <!-- asset num info -->
    <p
      v-if="token.assetNum"
      class="text-xs text-muted-foreground font-mono"
    >
      Asset num: {{ token.assetNum }}
    </p>

    <!-- Validation error -->
    <p
      v-if="modelValue && validationError.error"
      class="text-xs text-red-500"
    >
      {{ validationError.error }}
    </p>
  </div>
</template>
