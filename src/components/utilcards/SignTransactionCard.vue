<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiFileSign } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import type { ITransactionBase, TRole } from '@hiveio/wax/vite';
import { useRouter } from 'vue-router';
import { toastError } from '@/lib/parse-error';

const walletStore = useWalletStore();

const hasWallet = computed(() => walletStore.hasWallet);
const wallet = computed(() => walletStore.wallet);

const inputData = ref('');
const outputData = ref('');

const router = useRouter();

const isLoading = ref(false);

const sign = async () => {
  try {
    isLoading.value = true;

    try {
      JSON.parse(inputData.value);
    } catch (error) {
      toastError('Could not process the transaction object', error);
      return;
    }

    const wax = await getWax();

    let tx: ITransactionBase;

    try {
      tx = wax.createTransactionFromJson(inputData.value);
    } catch (error) {
      toastError('Could not process the transaction object', error);
      return;
    }

      const authorities = tx.requiredAuthorities;
      let authorityLevel: TRole = 'posting';
      if (authorities.owner.size)
        authorityLevel = 'owner';
      else if (authorities.active.size)
        authorityLevel = 'active';

    // TODO: Handle "other" authority

    outputData.value = await wallet.value!.signTransaction(tx, authorityLevel);
  } catch (error) {
    toastError('Error signing transaction', error);
  } finally {
    isLoading.value = false;
  }
};

const broadcast = async () => {
  try {
    isLoading.value = true;

    const wax = await getWax();

    const tx = wax.createTransactionFromJson(inputData.value);
    tx.sign(outputData.value);

    await wax.broadcast(tx);
  } catch (error) {
    toastError('Error broadcasting transaction', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  inputData.value = decodeURIComponent(atob(router.currentRoute.value.query.data as string ?? ''));
});
</script>

<template>
  <Card class="w-full max-w-[600px] bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Transaction signing</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiFileSign"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Use this module to sign the provided transaction</CardDescription>
    </CardHeader>
    <CardContent>
      <Textarea v-model="inputData" placeholder="Transaction in API JSON form" class="my-4"/>
      <div class="my-4 space-x-4">
        <Button :disabled="!inputData || !hasWallet || isLoading" @click="sign">Sign transaction</Button>
      </div>
      <Textarea v-model="outputData" placeholder="Signature" copy-enabled class="my-4" disabled/>
      <div class="my-4 space-x-4">
        <Button :disabled="!outputData || isLoading" @click="broadcast">Broadcast signed transaction</Button>
      </div>
    </CardContent>
  </Card>
</template>