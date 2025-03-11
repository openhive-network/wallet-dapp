<script setup lang="ts">
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import step1 from "@/assets/icons/wallets/peakvault/step1.webp";
import { ref } from 'vue';
import { mdiClose } from '@mdi/js';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';

const emit = defineEmits(["setaccount", "close"]);

const close = () => {
  emit("close");
};

const isLoading = ref(false);
const errorMsg = ref<string | null>(null);
const connect = async() => {
  try {
    isLoading.value = true;
    errorMsg.value = null;

    const { result } = await (window as any).peakvault.requestContact();

    emit("setaccount", result as string);
  } catch (error) {
    if (typeof error === "object" && error && "message" in error)
      errorMsg.value = error.message as string;
    else
      errorMsg.value = String(error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>
        <div class="inline-flex justify-between w-full">
          <div class="inline-flex items-center">
            <img :src="getWalletIcon(UsedWallet.PEAKVAULT)" class="w-[20px] mr-2" />
            <span class="mt-[2px]">PeakVault Connector</span>
          </div>
          <Button variant="ghost" size="sm" class="px-2" @click="close">
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="mdiClose"/></svg>
          </Button>
        </div>
      </CardTitle>
      <CardDescription>Follow these instructions to connect to PeakVault</CardDescription>
    </CardHeader>
    <CardContent class="text-sm">
      <div v-if="isLoading" class="space-y-4">
        <p>Step 2: Select the profile you want to use, e.g.:</p>
        <div class="flex justify-center">
          <img :src="step1" class="w-[260px] h-[200px] mt-4 border rounded-md p-2 ml-auto mr-auto" />
        </div>
      </div>
      <div v-else class="space-y-4">
        <p>Step 1: Click this button to connect:</p>
        <div class="flex justify-center">
          <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 py-4 border-[#ae2164] border-[2px]" @click="connect">
            <span class="text-md font-bold">Connect</span>
          </Button>
        </div>
      </div>
    </CardContent>
    <CardFooter>
      <span class="text-red-400" v-if="errorMsg"><span class="font-bold">Error: </span>{{ errorMsg }}</span>
    </CardFooter>
  </Card>
</template>
