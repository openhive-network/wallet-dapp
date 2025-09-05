<script setup lang="ts">
import type { NaiAsset } from '@hiveio/wax';
import { mdiSendOutline } from '@mdi/js';
import { ref, computed } from 'vue';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import AccountNameInput from '@/components/ui/hive/AccountNameInput.vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';

const settingsStore = useSettingsStore();
const userStore = useUserStore();

const isLoading = ref(false);
const isValidAccountName = ref(false);
const to = ref('');
const amount = ref('');
const memo = ref('');
const currency = ref<'HIVE' | 'HBD'>('HIVE');
const walletStore = useWalletStore();

const hasWallet = computed(() => walletStore.hasWallet);
const wallet = computed(() => walletStore.wallet);

const availableBalance = computed(() => {
  if (currency.value === 'HIVE')
    return userStore.balances?.HIVE.liquid.stringValue || '0.000';
  else
    return userStore.balances?.HBD.liquid.stringValue || '0.000';

});

const errorMessage = ref('');

const parseBalances = async (isDirectCall: boolean) => {
  if (amount.value === '')
    return null;

  const wax = await getWax();

  errorMessage.value = '';

  const asset = wax.ASSETS[currency.value];
  const amountRaw = BigInt(Math.floor(parseFloat(amount.value) * (10 ** asset.precision)));
  const availableRaw = userStore.balances?.[currency.value].liquid.amount || 0n;
  if (amountRaw > availableRaw) {
    const errorData = `Insufficient balance. Requested: ${amountRaw} satoshis, Available: ${availableRaw} satoshis`;

    if (isDirectCall)
      throw new Error(errorData);
    else
      return errorMessage.value = errorData;
  }

  return {
    amount: String(amountRaw),
    precision: asset.precision,
    nai: asset.nai
  } as NaiAsset;
};

const handleTransfer = async () => {
  try {
    isLoading.value = true;

    if (!hasWallet.value)
      await walletStore.openWalletSelectModal();

    const wax = await getWax();

    const amount = await parseBalances(true);

    const tx = await wax.createTransaction();
    tx.pushOperation({
      transfer_operation: {
        from: settingsStore.settings.account!,
        to: to.value,
        amount: amount as NaiAsset,
        memo: memo.value || ''
      }
    });

    await wallet.value!.signTransaction(tx);

    await wax.broadcast(tx);
  } catch (error) {
    toastError('Error signing transaction', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Transfer funds</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiSendOutline"
        /></svg>
      </CardTitle>
      <CardDescription>Send HIVE or HBD to another user.</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleTransfer">
        <div class="grid w-full items-center gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="to">Recipient</Label>
            <AccountNameInput
              id="to"
              v-model="to"
              label=""
              placeholder="Enter recipient's username"
              require-exists
              @validation-change="value => { isValidAccountName = value; }"
            />
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="amount">Amount</Label>
            <div class="flex gap-2">
              <Input
                id="amount"
                v-model="amount"
                type="number"
                placeholder="0.000"
                class="flex-grow"
                @update:model-value="parseBalances(false)"
              />
              <Select v-model="currency">
                <SelectTrigger class="w-[100px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIVE">
                    HIVE
                  </SelectItem>
                  <SelectItem value="HBD">
                    HBD
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p class="text-sm text-muted-foreground">
              Available: {{ availableBalance }} {{ currency }}
            </p>
            <span
              v-if="errorMessage"
              class="text-red-500 text-sm"
            >{{ errorMessage }}</span>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="memo">Memo (Optional)</Label>
            <Input
              id="memo"
              v-model="memo"
              placeholder="Enter a memo"
            />
          </div>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <Button
        :disabled="!to || !amount || !isValidAccountName || isLoading"
        :loading="isLoading"
        class="w-full"
        @click="handleTransfer"
      >
        Transfer
      </Button>
    </CardFooter>
  </Card>
</template>
