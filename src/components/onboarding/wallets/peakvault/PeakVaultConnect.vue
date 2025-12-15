<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { ref } from 'vue';

import step1 from '@/assets/icons/wallets/peakvault/step1.webp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';
import { toastError } from '@/utils/parse-error';

const emit = defineEmits(['setaccount', 'close']);

const close = () => {
  emit('close');
};

const isLoading = ref(false);
const connect = async () => {
  try {
    isLoading.value = true;

    const { result } = await window.peakvault.requestContact();

    emit('setaccount', result);
  } catch (error) {
    toastError('Failed to connect to PeakVault', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Card class="w-full max-w-[350px]">
    <CardHeader>
      <CardTitle>
        <div class="inline-flex justify-between w-full">
          <div class="inline-flex items-center">
            <img
              :src="getWalletIcon(UsedWallet.PEAKVAULT)"
              class="w-[20px] mr-2"
            >
            <span class="mt-[2px]">PeakVault Connector</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="px-2"
            @click="close"
          >
            <svg
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            ><path
              style="fill: hsl(var(--foreground))"
              :d="mdiClose"
            /></svg>
          </Button>
        </div>
      </CardTitle>
      <CardDescription>Follow these instructions to connect to PeakVault</CardDescription>
    </CardHeader>
    <CardContent class="text-sm">
      <div
        v-if="isLoading"
        class="space-y-4"
      >
        <p>Step 2: Select the profile you want to use, e.g.:</p>
        <div class="flex justify-center">
          <img
            :src="step1"
            class="w-[260px] h-[200px] mt-4 border rounded-md p-2 ml-auto mr-auto"
          >
        </div>
      </div>
      <div
        v-else
        class="space-y-4"
      >
        <p>Step 1: Click this button to connect:</p>
        <div class="flex justify-center">
          <Button
            :disabled="isLoading"
            variant="outline"
            size="lg"
            class="px-8 py-4 border-[#ae2164] border-[2px]"
            @click="connect"
          >
            <span class="text-md font-bold">Connect</span>
          </Button>
        </div>
      </div>
    </CardContent>
    <CardFooter />
  </Card>
</template>
