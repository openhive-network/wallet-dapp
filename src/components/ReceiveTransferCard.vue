<script setup lang="ts">
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import { TokenAmountInput } from '@/components/htm/amount';
import ReceiverTokenSummary from '@/components/ReceiverTokenSummary.vue';
import TransferCompletedSummary from '@/components/TransferCompletedSummary.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTokensStore, type CTokenDisplayBase } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

interface Props {
  receiverName?: string;
  receiverKey?: string;
  receiverAvatar?: string;
  tokenData: CTokenDisplayBase | undefined;
  queryAmount?: string;
  queryMemo?: string;
  assetNum: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  transferCompleted: [summary: { amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string }];
}>();

const router = useRouter();
const tokensStore = useTokensStore();

const tokenComputed = computed(() => props.tokenData);
const amountComputed = computed(() => props.queryAmount ? props.tokenData ? (props.queryAmount.slice(0, -props.tokenData.precision) + '.' + props.queryAmount.slice(-props.tokenData.precision)) : '' : '');

// Form state
const form = ref({
  amount: amountComputed.value || '',
  token: tokenComputed.value,
  memo: props.queryMemo || ''
});


const isSending = ref(false);
const transferCompleted = ref(false);
const sentSummary = ref<{ amount: string; tokenLabel: string; receiver: string; remainingBalance?: string; timestamp?: string } | null>(null);

// Check if user is logged in
const isLoggedIn = computed(() => !!tokensStore.wallet);

// TODO: Fix validation

const isFormValid = computed(() => {
  if (!form.value.token) return false;
  if (form.value.amount.trim() === '') return false;
  return true;
});

const handleSend = async () => {
  if (!form.value.token) {
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

  try {
    isSending.value = true;

    const sender = CTokensProvider.getOperationalPublicKey()!;

    await waitForTransactionStatus(
      () => ([{
        token_transfer_operation: {
          amount: {
            amount: form.value.amount,
            nai: form.value.token!.nai!,
            precision: form.value.token!.precision || 0
          },
          receiver: props.receiverKey!,
          sender,
          memo: form.value.memo
        }
      } satisfies htm_operation]),
      'Transfer'
    );

    transferCompleted.value = true;

    const balanceObj = await tokensStore.getBalanceSingleToken(sender, form.value.token.assetNum);

    const receiverLabel = props.receiverName || props.receiverKey || 'Recipient';
    const tokenLabel = form.value.token.symbol || form.value.token.name || String(form.value.token.assetNum) || '';

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
    form.value.amount = amountComputed.value;
});

watch(() => props.tokenData, (newValue) => {
  if (newValue)
    form.value.token = newValue;
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
        :variant="tokenComputed ? 'explicit' : 'selector'"
        :token="form.token"
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
          :memo="form.memo"
        />
      </div>
    </CardContent>
  </Card>
</template>
