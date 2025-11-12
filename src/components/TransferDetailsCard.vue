<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import ReceiverTokenSummary from '@/components/ReceiverTokenSummary.vue';
import TokenAmountInput from '@/components/TokenAmountInput.vue';
import TokenSelectorWithAmount from '@/components/TokenSelectorWithAmount.vue';
import TransferCompletedSummary from '@/components/TransferCompletedSummary.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import type { CtokensAppBalance, CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

interface Props {
  isReceiveMode: boolean;
  hasNaiFromUrl: boolean;
  shouldShowTokenSelector: boolean;
  receiverName?: string;
  receiverKey?: string;
  receiverAvatar?: string;
  tokenData?: CtokensAppToken | null;
  queryAmount?: string;
  queryMemo?: string;
  assetNum: string;
  precision: string;
  selectedTokenAssetNum?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  updateSelectedTokenAssetNum: [value: string];
  transferCompleted: [summary: { amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string }];
  updateAmount: [value: string];
  updateMemo: [value: string];
}>();

const router = useRouter();
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();
const walletStore = useWalletStore();

// Form state
const form = ref({
  amount: props.queryAmount || '',
  memo: props.queryMemo || ''
});

const selectedTokenAssetNum = computed({
  get: () => props.selectedTokenAssetNum || '',
  set: (value: string) => emit('updateSelectedTokenAssetNum', value)
});
const showDetails = ref(false);
const isUpdating = ref(false);
const isSending = ref(false);
const transferCompleted = ref(false);
const sentSummary = ref<{ amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string } | null>(null);

// Check if user is logged in
const isLoggedIn = computed(() => !!settingsStore.settings.account);

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

const isFormValid = computed(() => {
  if (props.isReceiveMode) {
    if (!props.tokenData) return false;
    if (form.value.amount.trim() === '') return true;
    return amountValidation.value.isValid;
  }
  if (props.shouldShowTokenSelector && !selectedTokenAssetNum.value) return false;
  if (form.value.amount.trim() === '') return true;
  return amountValidation.value.isValid;
});

const parseAssetAmount = (amountStr: string, precision: number): string => {
  const [integerPart, fractionalPart = ''] = amountStr.split('.');
  const normalizedFractional = fractionalPart.padEnd(precision, '0').slice(0, precision);
  return integerPart + normalizedFractional;
};

const formatAmount = (amount: string, precision: number, symbol?: string) => {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;

    const parts = num.toFixed(precision).split('.');
    parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.join('.');
    return symbol ? `${formatted} ${symbol}` : formatted;
  } catch {
    return amount;
  }
};

const handleSend = async () => {
  if (!props.tokenData) {
    toastError('Token not loaded', new Error('Token details not available'));
    return;
  }

  if (!isLoggedIn.value || !CTokensProvider.getOperationalPublicKey()) {
    toast.error('Please log in to your wallet first');
    router.push({
      path: '/',
      query: {
        redirect: router.currentRoute.value.fullPath
      }
    });
    return;
  }

  if (!form.value.amount || !props.receiverKey) {
    toastError('Missing required fields', new Error('Amount and receiver are required'));
    return;
  }

  if (!amountValidation.value.isValid) {
    toastError('Invalid amount', new Error(amountValidation.value.error || 'Invalid amount format'));
    return;
  }

  if (typeof settingsStore.settings.account === 'undefined' || walletStore.isL2Wallet)
    throw new Error('Transferring via proxy is not supported yet. Please log in using your L1 wallet first.');

  try {
    isSending.value = true;

    const baseAmount = parseAssetAmount(form.value.amount, props.tokenData.precision || 0);

    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: baseAmount,
            nai: props.tokenData!.nai!,
            precision: props.tokenData!.precision || 0
          },
          receiver: props.receiverKey!,
          sender: CTokensProvider.getOperationalPublicKey()!,
          memo: form.value.memo
        }
      } satisfies htm_operation]),
      'Transfer'
    );

    transferCompleted.value = true;

    await tokensStore.loadBalances(true);

    const receiverLabel = props.receiverName || props.receiverKey || 'Recipient';
    const tokenLabel = tokenSymbol.value || tokenName.value || props.tokenData!.nai || '';

    let remaining = '';
    const balanceObj = tokensStore.balances.find((b: CtokensAppBalance) => b.nai === props.tokenData!.nai) as CtokensAppBalance | undefined;
    if (balanceObj && balanceObj.amount) {
      try {
        const wax = await getWax();
        const formatted = wax.formatter.formatNumber(balanceObj.amount!, props.tokenData!.precision || 0);
        remaining = tokenSymbol.value ? `${formatted} ${tokenSymbol.value}` : formatted;
      } catch (_e) {
        remaining = formatAmount(balanceObj.amount!, props.tokenData!.precision || 0, tokenSymbol.value || tokenName.value);
      }
    }

    const ts = new Date().toISOString();

    sentSummary.value = {
      amount: form.value.amount,
      tokenLabel,
      receiver: receiverLabel,
      remainingBalance: remaining,
      timestamp: ts
    };

    emit('transferCompleted', sentSummary.value);
  } catch (error) {
    toastError('Transfer failed', error);
  } finally {
    isSending.value = false;
  }
};

// Watch query params changes to update form
watch(() => props.queryAmount, (newValue) => {
  if (newValue)
    form.value.amount = newValue;
});

watch(() => props.queryMemo, (newValue) => {
  if (newValue)
    form.value.memo = newValue;
});

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
      <CardTitle>Transfer details</CardTitle>
      <CardDescription>
        {{ isReceiveMode ? 'Review the transfer details' : (hasNaiFromUrl ? 'Specify the transfer amount' : 'Enter token details and specify the transfer amount') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Compact recipient + token summary -->
      <ReceiverTokenSummary
        :receiver-name="receiverName"
        :receiver-key="receiverKey"
        :receiver-avatar="receiverAvatar"
        :label="isReceiveMode ? 'Recipient' : 'Receiver'"
      />

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
        :readonly="isReceiveMode"
        :disabled="isUpdating"
        :auto-expand="!!queryMemo"
      />

      <!-- Actions / Summary -->
      <div class="pt-3">
        <!-- Send button (only shown when confirming a transfer request / receive-mode) -->
        <Button
          v-if="isReceiveMode && !transferCompleted"
          class="w-full"
          :disabled="isSending || !isFormValid"
          @click="handleSend"
        >
          {{ isSending ? 'Sending...' : (isLoggedIn ? 'Send Token' : 'Log in to Send Token') }}
        </Button>

        <!-- Bank-style confirmation summary shown after a successful transfer -->
        <TransferCompletedSummary
          v-if="transferCompleted"
          :amount="sentSummary?.amount || form.amount"
          :token-symbol="tokenSymbol"
          :token-name="tokenName"
          :is-receive-mode="isReceiveMode"
          :receiver-key="receiverKey"
          :receiver-name="receiverName"
          :remaining-balance="sentSummary?.remainingBalance"
          :timestamp="sentSummary?.timestamp"
          :asset-num="assetNum"
          :precision="precision"
          :memo="form.memo"
        />
      </div>
    </CardContent>
  </Card>
</template>
