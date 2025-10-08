<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { computed } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { UsedWallet } from '@/stores/settings.store';
import { getWalletIcon, stringifyWalletName } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';

const userStore = useUserStore();

const emit = defineEmits(['close']);

const props = defineProps<{
  account: string;
  wallet: UsedWallet;
}>();

const account = computed(() => {
  return userStore.transformUserName(props.account);
});

const stringifiedWallet = stringifyWalletName(props.wallet);

const close = () => {
  emit('close');
};
</script>

<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle class="inline-flex space-x-1">
        Wallet selected!
      </CardTitle>
      <CardDescription>You have succesfully connected your account with <span class="font-bold">{{ stringifiedWallet }}</span>!</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <div class="flex flex-col items-center space-y-3">
        <img
          :src="getWalletIcon(props.wallet)"
          class="w-[100px] translate-x--1/2 p-1"
        >
        <svg
          width="24"
          height="24"
          xmlns="http://www.w3.org/2000/svg"
          class=" translate-x--1/2"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsl(var(--foreground))"
          :d="mdiClose"
        /></svg>
        <span class="text-lg font-bold">{{ account }}</span>
      </div>
    </CardContent>
    <CardFooter class="flex justify-center">
      <Button
        variant="outline"
        size="lg"
        @click="close"
      >
        Close
      </Button>
    </CardFooter>
  </Card>
</template>
