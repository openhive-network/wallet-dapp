<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CollapsibleMemoInput from '@/components/CollapsibleMemoInput.vue';
import { TokenAmountInput } from '@/components/htm/amount';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CTokenDisplayBase } from '@/stores/tokens.store';
import CTokensProvider from '@/utils/wallet/ctokens/signer';


interface Props {
  hasNaiFromUrl: boolean;
  shouldShowTokenSelector: boolean;
  token?: CTokenDisplayBase;
  initialAmount?: string;
  initialMemo?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  updateToken: [value: CTokenDisplayBase | undefined];
  updateAmount: [value: string];
  updateMemo: [value: string];
}>();

// Form state
const form = ref({
  amount: props.initialAmount || '',
  memo: props.initialMemo || ''
});

const selectedToken = computed<CTokenDisplayBase | undefined>({
  get: () => props.token,
  set: (value) => {
    emit('updateToken', value);
  }
});

const userOperationalKey = computed(() => CTokensProvider.getOperationalPublicKey());

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
      <CardTitle>Receive token</CardTitle>
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

      <!-- Amount with token selector or explicit token -->
      <TokenAmountInput
        v-model="form.amount"
        v-model:token="selectedToken"
        :variant="shouldShowTokenSelector ? 'selector' : 'explicit'"
      />

      <!-- Memo compact -->
      <CollapsibleMemoInput
        v-model="form.memo"
        :auto-expand="!!initialMemo"
      />
    </CardContent>
  </Card>
</template>
