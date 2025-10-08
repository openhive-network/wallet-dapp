<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const emit = defineEmits(['setaccount', 'close']);

const close = () => {
  emit('close');
};

const isLoading = ref(false);

const managementKey = ref('');
const operationalKey = ref('');
const password = ref('');
const repeatPassword = ref('');

const connect = async () => {
  try {
    if (password.value !== repeatPassword.value) {
      toastError('Failed to connect to HTM', 'The provided passwords do not match');

      return;
    }

    isLoading.value = true;

    const { operational } = await CTokensProvider.createWallet(password.value, operationalKey.value, managementKey.value.length === 0 ? undefined : managementKey.value);

    const wax = await getWax();

    const users = await wax.restApi.ctokensApi.registeredUsers({ user: operational });
    if (users.length === 0) {
      toastError('Failed to connect to HTM', 'The provided operational key is not registered in HTM');

      return;
    }

    await CTokensProvider.login(password.value);

    emit('setaccount', operational);
  } catch (error) {
    toastError('Failed to connect to HTM', error);
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
            <img
              :src="getWalletIcon(UsedWallet.CTOKENS_IMPLEMENTATION)"
              class="w-[20px] mr-2"
            >
            <span class="mt-[2px]">HTM Connector</span>
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
      <CardDescription>Follow these instructions to connect to Hive Token Machine</CardDescription>
    </CardHeader>
    <CardContent class="text-sm space-y-4">
      <div class="space-y-4">
        <p>Step 1: Provide your login credentials:</p>

        <div class="space-y-2">
          <div class="space-y-1">
            <Label for="operationalKey">Operational Private Key</Label>
            <Input
              id="operationalKey"
              v-model="operationalKey"
              type="text"
              placeholder="Enter your operational key"
            />
          </div>
          <div class="space-y-1">
            <Label for="managementKey">Management Private Key (optional)</Label>
            <Input
              id="managementKey"
              v-model="managementKey"
              type="text"
              placeholder="Enter your management key"
            />
          </div>
          <div class="space-y-1">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter a password to encrypt the wallet"
            />
          </div>
          <div class="space-y-1">
            <Label for="repeatPassword">Repeat Password</Label>
            <Input
              id="repeatPassword"
              v-model="repeatPassword"
              type="password"
              placeholder="Repeat the password"
            />
          </div>
        </div>

        <p>Step 2: Click this button to verify your configuration and connect to the wallet:</p>
        <div class="flex justify-center">
          <Button
            :disabled="isLoading"
            variant="outline"
            size="lg"
            class="px-8 py-4 border-[#FBA510] border-[2px]"
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
