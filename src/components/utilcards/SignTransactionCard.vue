<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mdiFileSign } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import type { ITransaction, TRole } from '@hiveio/wax/vite';
import { useRouter } from 'vue-router';
import { toastError } from '@/utils/parse-error';
import { toast } from 'vue-sonner';
import { stringifyWalletName, useSettingsStore } from '@/stores/settings.store';

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const selectedLevel = ref<TRole | null>('posting');

const hasWallet = computed(() => walletStore.hasWallet);
const wallet = computed(() => walletStore.wallet);

const inputData = ref('');
const outputData = ref('');

const router = useRouter();

const isLoading = ref(false);
const isBroadcasting = ref(false);

const sign = async () => {
  try {
    isLoading.value = true;

    if (!hasWallet.value)
      await walletStore.openWalletSelectModal();

    try {
      JSON.parse(inputData.value);
    } catch (error) {
      toastError('Could not process the transaction object', error);
      return;
    }

    const wax = await getWax();

    let tx: ITransaction;

    try {
      tx = wax.createTransactionFromJson(inputData.value);
    } catch (error) {
      toastError('Could not process the transaction object', error);
      return;
    }

    try {
      await walletStore.createWalletFor(settingsStore.settings, selectedLevel.value as TRole);
    } catch (error) {
      toastError(`Could not create a wallet using ${stringifyWalletName(settingsStore.settings.wallet!)} - role ${selectedLevel.value}`, error);
      return;
    }

    await wallet.value!.signTransaction(tx);

    outputData.value = tx.toApi();
  } catch (error) {
    toastError('Error signing transaction', error);
  } finally {
    isLoading.value = false;
  }
};

const focusOutInputData = async () => {
  try {
    const wax = await getWax();

    const tx = wax.createTransactionFromJson(inputData.value);
    const auths = tx.requiredAuthorities;
    for(const auth in auths)
      if (auth === "other")
        continue;
      else
        if (((auths as any)[auth] as Set<string>).size > 0)
          selectedLevel.value = auth as TRole;
  } catch {
    return;
  }
};

const broadcast = async () => {
  try {
    isBroadcasting.value = true;

    const wax = await getWax();

    const tx = wax.createTransactionFromJson(outputData.value);

    await wax.broadcast(tx);

    toast.success('Transaction broadcasted successfully');
  } catch (error) {
    toastError('Error broadcasting transaction', error);
  } finally {
    isBroadcasting.value = false;
  }
};

onMounted(() => {
  inputData.value = decodeURIComponent(atob(router.currentRoute.value.query.data as string ?? ''));
});
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Transaction signing</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiFileSign"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Use this module to sign the provided transaction</CardDescription>
    </CardHeader>
    <CardContent>
      <Textarea @focusout="focusOutInputData" v-model="inputData" placeholder="Transaction in API JSON form" class="my-4" height="200px"/>
      <span class="text-foreground/70 my-4 text-sm">Sign using authority level:</span>
      <Select class="my-4" v-model="selectedLevel">
        <SelectTrigger>
          <SelectValue placeholder="Select authority level" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="memo">Memo</SelectItem>
            <SelectItem value="posting">Posting</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <div class="my-4 space-x-4">
        <Button :disabled="!inputData || isBroadcasting" :loading="isLoading" @click="sign">Sign transaction</Button>
      </div>
      <Textarea v-model="outputData" placeholder="Signed transaction" copy-enabled class="my-4" height="200px" disabled/>
      <div class="my-4 space-x-4">
        <Button :disabled="!outputData || isLoading" :loading="isBroadcasting" @click="broadcast">Broadcast signed transaction</Button>
      </div>
    </CardContent>
  </Card>
</template>