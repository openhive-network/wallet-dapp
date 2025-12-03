<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { useTokensStore, type CTokenDisplayBase } from '@/stores/tokens.store';

import Input from './Input.vue';
import TokenSelector from './TokenSelector.vue';

type CommonProps = {
  disabled?: boolean;
  id?: string;
  publicKey?: string;
}

type Props = (CommonProps & {
  variant?: 'selector';
  token?: CTokenDisplayBase;
}) | (CommonProps & {
  variant: 'explicit';
  token: CTokenDisplayBase;
  availableBalance?: string;
});

const props = withDefaults(defineProps<Props>(), {
  variant: 'selector',
  disabled: false
});

const model = defineModel<string>(); /* This model is for the parsed amount in asset num-compatible form. '' (empty) is for invalid state */
const selectedToken = defineModel<CTokenDisplayBase | undefined>('token'); /* This model is for the selected token when variant is "selector" */

const internalModel = ref<string>(''); /* This is the internal input model for the amount field */
const validationError = ref<string | undefined>(undefined); /* This is the validation error message, if any */

const selectedAvailableBalance = ref<string>('');

const tokensStore = useTokensStore();

// Rewrite display symbol
watch(internalModel, () => {
  if (!selectedToken.value || validationError.value) return;

  const [integerPart, decimalPart] = internalModel.value.replace(/[,\s]/g, '').split('.');

  model.value = integerPart + ((decimalPart ?? '').padEnd(selectedToken.value.precision, '0'));
}, { flush: 'post' }); // Flush after validation updates
watch(model, () => { // Allow clearing input when model is set to ''
  if (model.value === '' && validationError.value === undefined) // Clear only when there's no validation error
    internalModel.value = '';
});
watch(validationError, () => {
  // Clear model if there's a validation error
  if (validationError.value)
    model.value = '';
});
const publicKey = computed(() => props.publicKey || tokensStore.getUserPublicKey());
const refetchAvailableBalance = async(newValue: string | undefined) => {
  if (!newValue || !selectedToken.value) return;
  try {
    const tokensBalance = await tokensStore.getBalanceSingleToken(newValue, selectedToken.value.assetNum);
    selectedAvailableBalance.value = tokensBalance.displayBalance;
  } catch {} // TODO: Move this balance fetching logic to the components above
};
watch(publicKey, refetchAvailableBalance);
watch(selectedToken, async newValue => {
  if (newValue && 'displayBalance' in newValue) // only for CTokenBalanceDisplay - selector variant
    selectedAvailableBalance.value = newValue.displayBalance as string;
  else if (newValue) {
    if (!publicKey.value) return;
    try {
      const tokensBalance = await tokensStore.getBalanceSingleToken(publicKey.value, newValue.assetNum);
      selectedAvailableBalance.value = tokensBalance.displayBalance;
    } catch {} // TODO: Move this balance fetching logic to the components above
  }
});

const handleMax = () => {
  if (selectedAvailableBalance.value) {
    let data = selectedAvailableBalance.value.replace(/[A-Z a-z]/g, ''); // Remove any non-numeric characters (like token symbol)
    const [decimal, factorial] = data.split('.');
    // If factorial is all zeros, remove it so users can input factorial by themselves
    if (decimal && BigInt(factorial || 0) === 0n)
      data = decimal;

    model.value = data;
    internalModel.value = data;
  }
};

onMounted(() => {
  if (model.value)
    internalModel.value = model.value;
  if (props.token)
    selectedToken.value = props.token;
  if (props.variant === 'explicit' && props.availableBalance)
    selectedAvailableBalance.value = props.availableBalance;
  if (publicKey.value)
    refetchAvailableBalance(publicKey.value);
});
</script>

<template>
  <div class="space-y-2">
    <Label
      :for="id"
      class="text-sm font-medium text-foreground"
    >
      Amount
    </Label>
    <div :class="['relative flex rounded-md border-input border focus-within:ring-1 focus-within:ring-ring items-center w-full transition-colors', internalModel ? (validationError ? 'border-red-500 focus-visible:ring-red-500' : 'border-green-500 focus-visible:ring-green-500') : '']">
      <div :class="variant === 'selector' ? 'flex-1' : 'w-full'">
        <Input
          :id="id"
          v-model="internalModel"
          v-model:validation-error="validationError"
          :disabled="disabled"
          :token="selectedToken"
          :class="variant === 'selector' ? '' : 'pr-24'"
        />
      </div>
      <TokenSelector
        v-if="variant === 'selector'"
        v-model="selectedToken"
        :disabled="disabled"
        placeholder="Choose token"
        class="shrink-1"
      />
      <!-- Token Symbol & Image on the right -->
      <div v-if="variant === 'explicit' && selectedToken" class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <Avatar
          v-if="selectedToken.image"
          class="h-6 w-6"
        >
          <AvatarImage
            :src="selectedToken.image"
            :alt="selectedToken.symbol || selectedToken.name"
          />
          <AvatarFallback class="text-xs">
            {{ selectedToken.symbol?.slice(0, 2) || '-' }}
          </AvatarFallback>
        </Avatar>
        <span class="text-sm font-medium">
          {{ selectedToken.symbol }}
        </span>
      </div>
    </div>

    <!-- Available balance and MAX button -->
    <div
      v-if="selectedAvailableBalance"
      class="flex justify-between text-xs"
    >
      <span
        class="text-muted-foreground"
      >
        Available: {{ selectedAvailableBalance }}
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
    <p v-if="selectedToken" class="text-xs text-muted-foreground font-mono">
      Asset num: {{ selectedToken.assetNum }}
    </p>

    <!-- Validation error -->
    <p
      v-if="validationError"
      class="text-xs text-red-500"
    >
      {{ validationError }}
    </p>
  </div>
</template>
