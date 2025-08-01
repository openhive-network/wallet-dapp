<script lang="ts" setup>
import { mdiAlert } from '@mdi/js';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccountCreationStore } from '@/stores/account-creation.store';
import { useWalletStore } from '@/stores/wallet.store';

const props = defineProps<{ type: 'metamask' | 'regular' }>();

const walletStore = useWalletStore();
const router = useRouter();

const accountCreateStore = useAccountCreationStore();

const walletsStatus = computed(() => walletStore.walletsStatus);
const hasAnyWallet = computed(() =>
  walletsStatus.value.metamask || walletsStatus.value.keychain || walletsStatus.value.peakvault
);

const handleClick = async () => {
  accountCreateStore.resetCopyState();

  if (props.type === 'metamask') {
    if (!hasAnyWallet.value) {
      // Check specifically for MetaMask - if not installed, redirect to installation page
      if (!walletsStatus.value.metamask) {
        window.open('https://docs.metamask.io/snaps/get-started/install-flask/', '_blank');
        return;
      }
      // If other wallets are available, open wallet selection modal
      walletStore.openWalletSelectModal();
      return;
    }
    // Navigate to wallet selection for account creation
    router.push('/account/request?method=metamask');
  } else
    // Navigate to account creation without wallet
    router.push('/account/request?method=regular');

};
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="text-center">
      <div class="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <slot name="icon" />
      </div>
      <CardTitle class="text-xl">
        <slot name="title" />
      </CardTitle>
      <CardDescription class="text-base">
        <slot name="description" />
      </CardDescription>
    </CardHeader>
    <CardContent class="flex-1 flex flex-col justify-between">
      <div class="space-y-4 mb-6 mx-2">
        <slot name="features" />
      </div>
      <div class="space-y-3">
        <TooltipProvider :delay-duration="200">
          <Tooltip>
            <TooltipTrigger as-child>
              <div class="w-full">
                <Button
                  class="w-full"
                  @click="handleClick"
                >
                  <slot name="buttonText" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent
              v-if="type === 'metamask' && !walletsStatus.metamask"
              side="top"
              class="bg-amber-50 text-amber-800 border-amber-200 max-w-xs p-3"
            >
              <div class="flex items-start space-x-2">
                <svg
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="text-amber-500 mt-0.5 flex-shrink-0"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiAlert"
                  />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-bold text-amber-800">
                    MetaMask Required
                  </p>
                  <p class="text-sm text-amber-700 mt-1">
                    Click to install MetaMask extension to continue with this option.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardContent>
  </Card>
</template>
