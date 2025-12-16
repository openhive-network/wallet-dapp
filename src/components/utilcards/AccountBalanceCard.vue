<script setup lang="ts">
import { mdiWalletOutline } from '@mdi/js';
import { computed } from 'vue';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { BalanceData, useUserStore } from '@/stores/user.store';

const userStore = useUserStore();

const totalBalanceUSD = computed(() => {
  if (!userStore.isReady || !userStore.balances)
    return 0;

  const { HIVE, HBD, HP } = userStore.balances;
  let total = 0;

  total += HIVE.liquid.usdValue + HIVE.savings.usdValue + HIVE.unclaimed.usdValue;
  total += HBD.liquid.usdValue + HBD.savings.usdValue + HBD.unclaimed.usdValue;
  total += HP.owned.usdValue + HP.delegated.usdValue + HP.unclaimed.usdValue + HP.poweringDown.usdValue;

  return BalanceData.stringifyWithPrecision(BigInt(Math.floor(total*100)), 2);
});
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <span>Account Balances</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiWalletOutline"
        /></svg>
      </CardTitle>
      <CardDescription class="mr-8">
        Account balances for native chain assets
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div
        v-if="!userStore.isReady || !userStore.balances"
        class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6"
      >
        <div
          v-for="i in 2"
          :key="i"
          class="space-y-2"
        >
          <Skeleton class="h-5 w-24" />
          <div class="space-y-3 pl-4">
            <div
              v-for="j in 3"
              :key="j"
              class="flex justify-between items-center"
            >
              <Skeleton class="h-4 w-16" />
              <Skeleton class="h-4 w-24" />
            </div>
          </div>
        </div>
        <div class="col-span-2 space-y-2">
          <Skeleton class="h-5 w-24" />
          <div class="space-y-3 pl-4">
            <div
              v-for="j in 5"
              :key="j"
              class="flex justify-between items-center"
            >
              <Skeleton class="h-4 w-20" />
              <Skeleton class="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="userStore.balances"
        class="flex flex-col gap-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-stretch">
          <!-- HIVE Balances -->
          <div class="flex-1 sm:pr-4 pb-4 sm:pb-0">
            <h3 class="text-md font-semibold flex items-center">
              <div class="w-3 h-3 rounded-full bg-primary mr-2" />
              HIVE
            </h3>
            <div class="ml-5 space-y-1 text-sm">
              <div class="grid grid-cols-3">
                <span class="text-muted-foreground">Liquid:</span>
                <span class="font-mono text-right col-span-2">{{ userStore.balances.HIVE.liquid.stringValue }}</span>
                <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HIVE.liquid.usdString }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-muted-foreground">Savings:</span>
                <span class="font-mono text-right col-span-2">{{ userStore.balances.HIVE.savings.stringValue }}</span>
                <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HIVE.savings.usdString }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-muted-foreground">Unclaimed:</span>
                <span class="font-mono text-right col-span-2">{{ userStore.balances.HIVE.unclaimed.stringValue }}</span>
                <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HIVE.unclaimed.usdString }}</span>
              </div>
            </div>
          </div>
          <Separator
            orientation="vertical"
            class="hidden sm:block h-auto"
          />
          <Separator
            orientation="horizontal"
            class="sm:hidden"
          />
          <!-- HBD Balances -->
          <div class="flex-1 sm:pl-4 pt-4 sm:pt-0">
            <h3 class="text-md font-semibold flex items-center">
              <div class="w-3 h-3 rounded-full bg-green-500 mr-2" />
              HBD
            </h3>
            <div class="ml-5 space-y-1 text-sm">
              <div class="grid grid-cols-3">
                <span class="text-muted-foreground">Liquid:</span>
                <span class="font-mono text-right col-span-2">{{ userStore.balances.HBD.liquid.stringValue }}</span>
                <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HBD.liquid.usdString }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-muted-foreground">Savings:</span>
                <span class="font-mono text-right col-span-2">{{ userStore.balances.HBD.savings.stringValue }}</span>
                <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HBD.savings.usdString }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-muted-foreground">Unclaimed:</span>
                <span class="font-mono text-right col-span-2">{{ userStore.balances.HBD.unclaimed.stringValue }}</span>
                <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HBD.unclaimed.usdString }}</span>
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <!-- HP Balances -->
        <div>
          <h3 class="text-md font-semibold flex items-center">
            <div class="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            HP (HIVE Power)
          </h3>
          <div class="ml-5 space-y-1 text-sm">
            <div class="grid grid-cols-3">
              <span class="text-muted-foreground">Owned:</span>
              <span class="font-mono text-right col-span-2">{{ userStore.balances.HP.owned.stringValue }}</span>
              <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HP.owned.usdString }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-muted-foreground">Received:</span>
              <span class="font-mono text-right col-span-2">{{ userStore.balances.HP.received.stringValue }}</span>
              <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HP.received.usdString }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-muted-foreground">Delegated:</span>
              <span class="font-mono text-right col-span-2">{{ userStore.balances.HP.delegated.stringValue }}</span>
              <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HP.delegated.usdString }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-muted-foreground">Unclaimed:</span>
              <span class="font-mono text-right col-span-2">{{ userStore.balances.HP.unclaimed.stringValue }}</span>
              <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HP.unclaimed.usdString }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-muted-foreground">Powering Down:</span>
              <span class="font-mono text-right col-span-2">{{ userStore.balances.HP.poweringDown.stringValue }}</span>
              <span class="font-mono text-right text-xs text-muted-foreground col-start-2 col-span-2">${{ userStore.balances.HP.poweringDown.usdString }}</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
    <CardFooter class="flex justify-between items-baseline pt-4 border-t">
      <span class="text-muted-foreground">Total Estimated Value</span>
      <div
        v-if="userStore.isReady"
        class="flex items-baseline"
      >
        <span class="text-2xl font-bold tracking-tight">${{ totalBalanceUSD }}</span>
      </div>
      <Skeleton
        v-else
        class="h-8 w-28"
      />
    </CardFooter>
  </Card>
</template>
