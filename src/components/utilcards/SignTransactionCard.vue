<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mdiFileSign } from '@mdi/js';
import { computed, ref } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import type { TRole } from '@hiveio/wax/vite';

const walletStore = useWalletStore();

const hasWallet = computed(() => walletStore.hasWallet);
const wallet = computed(() => walletStore.wallet);

const inputData = ref('');
const outputData = ref('');

const sign = async () => {
  const wax = await getWax();

  const tx = wax.createTransactionFromJson(inputData.value);

  const authorities = tx.requiredAuthorities;
  let authorityLevel: TRole = 'posting';
  if (authorities.owner.size)
    authorityLevel = 'owner';
  else if (authorities.active.size)
    authorityLevel = 'active';

  // TODO: Handle "other" authority

  outputData.value = await wallet.value!.signTransaction(tx, authorityLevel);
};
</script>

<template>
  <Card class="bg-black/40 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Transaction signing</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiFileSign"/></svg>
      </CardTitle>
      <CardDescription class="mr-4">Use this module to sign the provided transaction</CardDescription>
    </CardHeader>
    <CardContent>
      <Textarea v-model="inputData" placeholder="Transaction in API JSON form" class="my-4"/>
      <div class="my-4 space-x-4">
        <Button :disabled="!hasWallet" @click="sign">Sign transaction</Button>
      </div>
      <Textarea v-model="outputData" placeholder="Signed Transaction output" copy-enabled class="my-4" disabled/>
    </CardContent>
  </Card>
</template>