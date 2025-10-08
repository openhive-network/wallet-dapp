<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { ref } from 'vue';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsedWallet, getWalletIcon, useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const walletStore = useWalletStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

const isLoading = ref(false);

const close = () => {
  walletStore.isProvideWalletPasswordModalOpen = false;
};

const password = ref('');

const connect = async () => {
  try {
    isLoading.value = true;

    await CTokensProvider.login(password.value);

    try {
      await walletStore.createWalletFor(settingsStore.settings, 'posting');

      await userStore.parseUserData(settingsStore.settings.account!);
    } catch (error) {
      toastError('Failed to create wallet', error);
    }

    toast.success('Logged in successfully!');

    close();
  } catch (error) {
    toastError('Failed to connect to HTM', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center">
    <div class="onboarding-container">
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
          <CardDescription>Follow these instructions to log into Hive Token Machine wallet</CardDescription>
        </CardHeader>
        <CardContent class="text-sm space-y-4">
          <div class="space-y-4">
            <p>Provide your HTM wallet password:</p>

            <div class="space-y-2">
              <div class="space-y-1">
                <Label for="password">Password</Label>
                <Input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="Enter a password to encrypt the wallet"
                />
              </div>
            </div>

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
    </div>
  </div>
</template>

<style scoped>
.onboarding-container {
  max-height: 90vh;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
