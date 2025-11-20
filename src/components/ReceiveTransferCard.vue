<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import ReceiverTokenSummary from '@/components/ReceiverTokenSummary.vue';
import TransferCompletedSummary from '@/components/TransferCompletedSummary.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTokensStore, type CTokenDisplayBase } from '@/stores/tokens.store';
import { parseAssetAmount } from '@/utils/nai-tokens';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

import { TokenAmountInput } from '~/src/components/htm/amount';


interface Props {
  receiverName?: string;
  receiverKey?: string;
  receiverAvatar?: string;
  tokenData: CTokenDisplayBase;
  queryAmount?: string;
  queryMemo?: string;
  assetNum: number;
  precision: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  transferCompleted: [summary: { amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string }];
}>();

const router = useRouter();
const tokensStore = useTokensStore();

// Form state
const form = ref({
  amount: props.queryAmount || '',
  memo: props.queryMemo || ''
});

const isSending = ref(false);
const transferCompleted = ref(false);
const sentSummary = ref<{ amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string } | null>(null);

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

const tokenAmountInputValidation = ref<{ isValid: boolean; error?: string }>({ isValid: false });

const isFormValid = computed(() => {
  if (!props.tokenData) return false;
  if (form.value.amount.trim() === '') return true;
  return tokenAmountInputValidation.value.isValid;
});

const handleSend = async () => {
  if (!props.tokenData) {
    toastError('Token not loaded', new Error('Token details not available'));
    return;
  }

  if (!isLoggedIn.value || !CTokensProvider.getOperationalPublicKey()) {
    toast.error('Please log in to your wallet first');
    router.push({
      path: '/tokens/list'
    });
    return;
  }

  if (!form.value.amount || !props.receiverKey) {
    toastError('Missing required fields', new Error('Amount and receiver are required'));
    return;
  }

  if (!tokenAmountInputValidation.value.isValid) {
    toastError('Invalid amount', new Error(tokenAmountInputValidation.value.error || 'Invalid amount format'));
    return;
  }

  try {
    isSending.value = true;

    const baseAmount = parseAssetAmount(form.value.amount, props.tokenData.precision || 0);

    const sender = CTokensProvider.getOperationalPublicKey()!;

    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: baseAmount,
            nai: props.tokenData!.nai!,
            precision: props.tokenData!.precision || 0
          },
          receiver: props.receiverKey!,
          sender,
          memo: form.value.memo
        }
      } satisfies htm_operation]),
      'Transfer'
    );

    transferCompleted.value = true;

    const balanceObj = await tokensStore.getBalanceSingleToken(sender, props.tokenData.assetNum);

    const receiverLabel = props.receiverName || props.receiverKey || 'Recipient';
    const tokenLabel = props.tokenData.symbol || props.tokenData.name || String(props.tokenData.assetNum) || '';

    const ts = new Date().toISOString();

    sentSummary.value = {
      amount: form.value.amount,
      tokenLabel,
      receiver: receiverLabel,
      remainingBalance: balanceObj.displayBalance,
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
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Confirm Transfer</CardTitle>
      <CardDescription>
        Review the transfer details and confirm
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Compact recipient + token summary -->
      <ReceiverTokenSummary
        :receiver-name="receiverName"
        :receiver-key="receiverKey"
        :receiver-avatar="receiverAvatar"
        label="Recipient"
      />

      <!-- Amount compact -->
      <TokenAmountInput
        id="token-amount"
        v-model="form.amount"
        variant="selector"
        :token="tokenData"
      />

      <!-- Memo compact -->
      <CollapsibleMemoInput
        v-model="form.memo"
        :readonly="true"
        :auto-expand="!!queryMemo"
      />

      <!-- Actions / Summary -->
      <div class="pt-3">
        <!-- Send button -->
        <Button
          v-if="!transferCompleted"
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
          :token-symbol="tokenData?.symbol"
          :token-name="tokenData!.name!"
          :is-receive-mode="true"
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
