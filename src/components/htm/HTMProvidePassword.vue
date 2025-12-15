<script setup lang="ts">
import { mdiClose } from '@mdi/js';

import HTMProvidePasswordContent from '@/components/htm/HTMProvidePasswordContent.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';

const walletStore = useWalletStore();
const tokensStore = useTokensStore();

const close = (ignoreLogIn = false) => {
  if (ignoreLogIn) // Do not show log in dialog every time if user ignored it
    tokensStore.ignoreLogIn = true;

  walletStore.isProvideWalletPasswordModalOpen = false;
};
</script>

<template>
  <div class="bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center">
    <div class="onboarding-container">
      <Card class="w-full max-w-[350px]">
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
                @click="close(true)"
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
          <HTMProvidePasswordContent @success="close()" />
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
