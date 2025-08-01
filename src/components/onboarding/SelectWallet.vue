<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { computed } from 'vue';

import OnboardingButton from '@/components/onboarding/OnboardingWalletButton.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getWalletIcon, UsedWallet } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';

const walletStore = useWalletStore();
const walletsStatus = computed(() => walletStore.walletsStatus);

const emit = defineEmits(['walletSelect', 'close']);

const useWallet = (type: UsedWallet) => {
  emit('walletSelect', type);
};

const close = () => {
  emit('close');
};
</script>

<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>
        <div class="inline-flex justify-between w-full">
          <div class="inline-flex items-center">
            <span class="mt-[2px]">Select wallet</span>
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
      <CardDescription>If your wallet is not detected, try unlocking it and refreshing the page</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <OnboardingButton
        download-url="https://docs.metamask.io/snaps/get-started/install-flask/"
        :disabled="!walletsStatus.metamask"
        :logo-url="getWalletIcon(UsedWallet.METAMASK)"
        name="Metamask"
        description="Use your derived keys"
        @click="useWallet(UsedWallet.METAMASK)"
      />
      <OnboardingButton
        download-url="https://hive-keychain.com/"
        :disabled="!walletsStatus.keychain"
        :logo-url="getWalletIcon(UsedWallet.KEYCHAIN)"
        name="Keychain"
        description="Use already imported accounts"
        @click="useWallet(UsedWallet.KEYCHAIN)"
      />
      <OnboardingButton
        download-url="https://vault.peakd.com/peakvault/guide.html#installation"
        :disabled="!walletsStatus.peakvault"
        :logo-url="getWalletIcon(UsedWallet.PEAKVAULT)"
        name="PeakVault"
        description="Use already imported accounts"
        @click="useWallet(UsedWallet.PEAKVAULT)"
      />
    </CardContent>
    <CardFooter />
  </Card>
</template>
