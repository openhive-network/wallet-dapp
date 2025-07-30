<script setup lang="ts">
import { mdiAccountBadgeOutline } from '@mdi/js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWalletStore } from '@/stores/wallet.store';

const walletStore = useWalletStore();
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Connect your account</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiAccountBadgeOutline"
        /></svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Connect to wallet of your choice in order to manage your account using Hive Bridge
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <Button
          class="w-full font-bold"
          @click="walletStore.openWalletSelectModal()"
        >
          Connect your wallet now
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
