<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import TokenAmountInput from '@/components/htm/tokens/TokenAmountInput.vue';
import TokenSelectorWithAmount from '@/components/htm/tokens/TokenSelectorWithAmount.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';


interface Props {
  hasNaiFromUrl: boolean;
  shouldShowTokenSelector: boolean;
  tokenData?: CtokensAppToken | null;
  assetNum: string;
  precision: string;
  selectedTokenAssetNum?: string;
  initialAmount?: string;
  initialMemo?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  updateSelectedTokenAssetNum: [value: string];
  updateAmount: [value: string];
  updateMemo: [value: string];
}>();

// Form state
const form = ref({
  amount: props.initialAmount || '',
  memo: props.initialMemo || ''
});

const selectedTokenAssetNum = computed({
  get: () => props.selectedTokenAssetNum || '',
  set: (value: string) => emit('updateSelectedTokenAssetNum', value)
});

const showDetails = ref(false);

const userOperationalKey = computed(() => CTokensProvider.getOperationalPublicKey());

const tokenName = computed(() => {
  if (!props.tokenData) return 'Unknown Token';
  const metadata = props.tokenData.metadata as { name?: string } | undefined;
  return metadata?.name || props.tokenData.nai || 'Unknown Token';
});

const tokenSymbol = computed(() => {
  if (!props.tokenData) return '';
  const metadata = props.tokenData.metadata as { symbol?: string } | undefined;
  return metadata?.symbol || '';
});

const tokenImage = computed(() => {
  if (!props.tokenData) return '';
  const metadata = props.tokenData.metadata as { image?: string } | undefined;
  return metadata?.image || '';
});

const amountValidation = computed(() => {
  if (!form.value.amount)
    return { isValid: true, error: '' };

  if (!props.tokenData)
    return { isValid: true, error: '' };

  return validateAmountPrecision(form.value.amount, props.tokenData.precision || 0);
});

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

// Watch form changes to emit updates
watch(() => form.value.amount, (newValue) => {
  emit('updateAmount', newValue);
});

watch(() => form.value.memo, (newValue) => {
  emit('updateMemo', newValue);
});
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Send Token</CardTitle>
      <CardDescription>
        {{ hasNaiFromUrl ? 'Specify the transfer amount and generate a QR code' : 'Enter token details and generate a QR code for transfer' }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Display receiver (you) -->
      <div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <div class="flex-1">
          <div class="text-xs text-muted-foreground mb-1">Receiver</div>
          <div class="font-medium">You</div>
          <div class="text-xs text-muted-foreground font-mono mt-1">
            {{ userOperationalKey }}
          </div>
        </div>
      </div>

      <!-- Token selector (compact) -->
      <TokenSelectorWithAmount
        v-if="shouldShowTokenSelector"
        v-model="form.amount"
        v-model:selected-token-asset-num="selectedTokenAssetNum"
        :token-symbol="tokenSymbol"
        :token-name="tokenName"
        :token-precision="props?.precision"
        :token-image="props.tokenData?.metadata?.image"
        :is-valid="amountValidation.isValid"
        :validation-error="amountValidation.error"
      />

      <!-- Small details toggle for NAI/precision when needed -->
      <div
        v-if="!hasNaiFromUrl && !shouldShowTokenSelector"
        class="flex items-center justify-between"
      >
        <div class="text-xs text-muted-foreground">
          Asset num / precision
        </div>
        <Button
          size="sm"
          variant="ghost"
          class="px-2 py-1"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'Hide' : 'Show' }}
        </Button>
      </div>

      <div
        v-if="showDetails && !hasNaiFromUrl && !shouldShowTokenSelector"
        class="grid grid-cols-2 gap-2"
      >
        <Input
          id="asset-num"
          type="text"
          placeholder="Asset number"
          class="transition-colors"
          disabled
          :value="assetNum"
        />
        <Input
          id="precision"
          type="number"
          placeholder="Precision"
          min="0"
          max="18"
          class="transition-colors"
          disabled
          :value="precision"
        />
      </div>

      <!-- Amount compact -->
      <TokenAmountInput
        v-if="!shouldShowTokenSelector"
        v-model="form.amount"
        :token-name="tokenName"
        :token-symbol="tokenSymbol"
        :token-image="tokenImage"
        :token-asset-num="assetNum"
        :precision="tokenData?.precision"
        :is-valid="amountValidation.isValid"
        :validation-error="amountValidation.error"
      />

      <!-- Memo compact -->
      <CollapsibleMemoInput
        v-model="form.memo"
        :auto-expand="!!initialMemo"
      />
    </CardContent>
  </Card>
</template>
