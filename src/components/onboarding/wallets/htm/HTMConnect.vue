<script setup lang="ts">
import { mdiClose } from '@mdi/js';

import HTMLoginContent from '@/components/HTMLoginContent.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UsedWallet, getWalletIcon } from '@/stores/settings.store';

const emit = defineEmits(['setaccount', 'close']);

const close = () => {
  emit('close');
};

const handleSetAccount = (account: string) => {
  emit('setaccount', account);
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
    <CardContent>
      <HTMLoginContent @setaccount="handleSetAccount" />
    </CardContent>
    <CardFooter />
  </Card>
</template>
