<script setup lang="ts">
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import step1 from "@/assets/icons/wallets/keychain/step1.webp";
import { ref } from 'vue';
import { mdiClose } from '@mdi/js';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';

const emit = defineEmits(["setaccount", "close"]);

const close = () => {
  emit("close");
};

const isLoading = ref(false);
const errorMsg = ref<string | null>(null);
const selectedLevel = ref<string | null>('posting');

const connect = async() => {
  try {
    isLoading.value = true;
    errorMsg.value = null;

    const response = await new Promise((resolve, reject) => {
      (window as any).hive_keychain.requestSignBuffer(
        null,
        "Wee need you to sign a message using selected authority level to confirm your account",
        selectedLevel.value,
        (response: any) => {
          if (response.error)
            reject(response);
          else
            resolve(response);
        },
        undefined,
        "Confirm your account",
      );
    }) as any;

    emit("setaccount", response.data.username);
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
            <img :src="getWalletIcon(UsedWallet.KEYCHAIN)" class="w-[20px] mr-2" />
            <span class="mt-[2px]">Keychain Connector</span>
          </div>
          <Button variant="ghost" size="sm" class="px-2" @click="close">
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="mdiClose"/></svg>
          </Button>
        </div>
      </CardTitle>
      <CardDescription>Follow these instructions to connect to Keychain</CardDescription>
    </CardHeader>
    <CardContent class="text-sm space-y-4">
      <div v-if="isLoading" class="space-y-4">
        <p>Step 3: Sign the message to confirm your authority, e.g.:</p>
        <div class="flex justify-center">
          <img :src="step1" class="w-[287px] h-[287px] mt-4 border rounded-md p-2 ml-auto mr-auto" />
        </div>
        <p>Note: If you get any error - try again with different level (e.g. Posting)</p>
      </div>
      <div v-else class="space-y-4">
      <p>Step 1: Select level of the imported key:</p>
      <Select v-model="selectedLevel">
        <SelectTrigger>
          <SelectValue placeholder="Select authority level" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="memo">Memo</SelectItem>
            <SelectItem value="posting">Posting</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <p>Step 2: Click this button to verify your configuration and connect to the wallet:</p>
      <div class="flex justify-center">
        <Button :disabled="isLoading" variant="outline" size="lg" class="px-8 py-4 border-[#e31337] border-[2px]" @click="connect">
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
