<script setup lang="ts">
import { Input as ShadInput } from '@/components/ui/input';
import type { CTokenDisplayBase } from '@/stores/tokens.store';

// Props:
const props = defineProps<{
  token?: CTokenDisplayBase
  disabled?: boolean;
  class?: string;
  id?: string;
}>();

// Models:

/* This model is for the parsed amount in NAI-compatible form. */
const model = defineModel<string>();

/* This model is for the validation error message, if any */
const validationErrorModel = defineModel<string | undefined>('validationError');

// Methods:
const validateAmountPrecision = (amount: string, precision: number): void => {
  try {
    if (amount === '') {
      validationErrorModel.value = undefined;
      return;
    }

    const cleanAmount = amount.replace(/[,\s]/g, '');
    const [integerPart, decimalPart, anyMore] = cleanAmount.split('.');
    if (anyMore !== undefined) {
      validationErrorModel.value = 'Invalid amount format';
      return;
    }

    const decimal = BigInt(decimalPart || 0);
    const integer = BigInt(integerPart || 0);

    if (integer <= 0n) {
      validationErrorModel.value = 'Amount must be a positive number';
      return;
    }

    if (decimal !== 0n && (decimalPart?.length || 0) > precision) {
      validationErrorModel.value = `Amount has too many decimal places. Maximum ${precision} decimal places allowed for this token.`;
      return;
    }

    validationErrorModel.value = undefined;
  } catch {
    validationErrorModel.value = 'Invalid amount format';
  }
};

watch(model, () => {
  if (props.token)
    validateAmountPrecision(model.value || '', props.token.precision);
});
</script>

<template>
  <ShadInput
    :id="props.id"
    v-model="model"
    no-border
    :class="props.class"
    type="text"
    inputmode="decimal"
    :placeholder="props.token ? `${props.token.precision} precision amount` : 'Select a token first'"
    :disabled="!props.token || disabled"
  />
</template>
