<script setup lang="ts">
import { mdiCheckCircle } from '@mdi/js';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

interface Props {
  amount: string;
  tokenSymbol?: string;
  tokenName: string;
  isReceiveMode: boolean;
  receiverKey?: string;
  receiverName?: string;
  remainingBalance?: string;
  timestamp?: string;
  assetNum: number;
  precision: string;
  memo?: string;
}

const props = defineProps<Props>();

const router = useRouter();

const generateInvoice = () => {
  const params = new URLSearchParams({
    fromPk: props.isReceiveMode ? CTokensProvider.getOperationalPublicKey() || '' : CTokensProvider.getOperationalPublicKey() || '',
    toPk: props.isReceiveMode ? props.receiverKey || '' : CTokensProvider.getOperationalPublicKey() || '',
    'asset-num': props.assetNum.toString(),
    amount: props.amount
  });

  if (props.memo)
    params.append('memo', props.memo);

  router.push({
    path: '/tokens/invoice',
    query: Object.fromEntries(params)
  });
};
</script>

<template>
  <div class="mt-4">
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                style="fill: currentColor"
                :d="mdiCheckCircle"
                class="text-green-600"
              />
            </svg>
          </div>
          <div>
            <CardTitle class="text-lg">
              Transfer Completed
            </CardTitle>
            <CardDescription class="text-sm text-muted-foreground">
              {{ timestamp || new Date().toISOString() }}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="text-3xl font-extrabold text-foreground">
          {{ amount }} <span class="text-xl font-semibold">{{ tokenSymbol || tokenName }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div class="space-y-1">
            <div class="text-xs text-muted-foreground">
              From
            </div>
            <div class="font-medium">
              {{ isReceiveMode ? receiverKey?.substring(0, 6) + '...' + receiverKey?.substring(receiverKey.length - 4) : receiverName }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-xs text-muted-foreground">
              To
            </div>
            <div class="font-medium truncate">
              {{ isReceiveMode ? receiverName : receiverKey?.substring(0, 6) + '...' + receiverKey?.substring(receiverKey.length - 4) }}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Remaining balance
          </div>
          <div class="font-medium">
            {{ remainingBalance || '—' }}
          </div>
        </div>

        <div class="border-t pt-3">
          <Button
            size="sm"
            class="w-full"
            @click.prevent="generateInvoice"
          >
            Generate Invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
