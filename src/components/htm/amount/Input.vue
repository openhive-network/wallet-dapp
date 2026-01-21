<script setup lang="ts">
import { Input as ShadInput } from '@/components/ui/input';
import type { CTokenDisplayBase } from '@/stores/tokens.store';
import { validateAmountPrecision } from '@/utils/validators';

// Props:
const props = defineProps<{
  token?: CTokenDisplayBase
  disabled?: boolean;
  class?: string;
  id?: string;
  dataTestid?: string;
}>();

// Models:

/* This model is for the parsed amount in Assset num-compatible form. */
const model = defineModel<string>();

/* This model is for the validation error message, if any */
const validationErrorModel = defineModel<string | undefined>('validationError');

// Methods:
const validateAmount = (amount: string, precision: number): void => {
  if (amount === '') {
    validationErrorModel.value = undefined;
    return;
  }

  const validation = validateAmountPrecision(amount, precision);
  validationErrorModel.value = validation.error;
};

watch(model, () => {
  if (props.token)
    validateAmount(model.value || '', props.token.precision);
});
</script>

<template>
  <ShadInput
    :id="props.id"
    v-model="model"
    no-border
    :class="props.class"
    :data-testid="props.dataTestid"
    type="text"
    inputmode="decimal"
    :placeholder="props.token ? `${props.token.precision} precision amount` : 'Select a token first'"
    :disabled="!props.token || disabled"
  />
</template>
