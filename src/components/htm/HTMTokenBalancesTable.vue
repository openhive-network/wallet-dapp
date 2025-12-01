<script setup lang="ts">
import { mdiArrowUp, mdiArrowDown, mdiSend } from '@mdi/js';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TextTooltip from '@/components/ui/texttooltip/TextTooltip.vue';
import type { CTokenPairBalanceDefinition } from '@/stores/tokens.store';

// Props
interface Props {
  balances: CTokenPairBalanceDefinition[];
  showActions?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  showActions: true,
  loading: false
});

// Emits
const emit = defineEmits<{
  transfer: [balance: CTokenPairBalanceDefinition['liquid']];
  stake: [balance: CTokenPairBalanceDefinition['liquid']];
  unstake: [balance: CTokenPairBalanceDefinition['vesting']];
}>();

const handleTransfer = (balance: CTokenPairBalanceDefinition['liquid']) => {
  emit('transfer', balance);
};

const handleStake = (balance: CTokenPairBalanceDefinition['liquid']) => {
  emit('stake', balance);
};

const handleUnstake = (balance: CTokenPairBalanceDefinition['vesting']) => {
  emit('unstake', balance);
};
</script>

<template>
  <Card>
    <CardContent class="p-0">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b">
            <tr class="hover:bg-muted/50">
              <th class="text-left p-4 font-medium text-muted-foreground">
                Asset
              </th>
              <th class="text-right p-4 font-medium text-muted-foreground">
                Balances
              </th>
              <th class="text-right p-4 font-medium text-muted-foreground">
                Total
              </th>
              <th v-if="showActions" class="text-right p-4 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="balance in balances"
              :key="balance.liquid.assetNum"
              class="border-b hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <NuxtLink
                :to="`/tokens/token?asset-num=${balance.liquid.assetNum}`"
                class="contents keychainify-checked"
              >
                <!-- Asset Info -->
                <td class="p-4">
                  <div class="flex items-center gap-3">
                    <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      <img
                        v-if="balance.liquid.image"
                        :src="balance.liquid.image"
                        :alt="balance.liquid.symbol"
                        class="h-full w-full object-cover"
                      >
                      <span
                        v-else
                        class="text-sm font-medium text-primary"
                      >
                        {{ balance.liquid.symbol?.charAt(0).toUpperCase() || '' }}
                      </span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold">
                          {{ balance.liquid.name }}
                        </span>
                        <span
                          v-if="balance.vesting.balance > 0n"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          <svg
                            width="12"
                            height="12"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                          >
                            <path
                              style="fill: currentColor"
                              :d="mdiArrowUp"
                            />
                          </svg>
                          STAKED
                        </span>
                      </div>
                      <div class="text-sm text-muted-foreground">
                        {{ balance.liquid.symbol }}
                      </div>
                      <div class="text-xs text-muted-foreground font-mono">
                        {{ balance.liquid.assetNum }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Combined Balances -->
                <td class="p-4 align-middle">
                  <div class="ml-auto flex w-full max-w-[260px] flex-col gap-3 text-sm">
                    <div class="flex items-center justify-between gap-3">
                      <span
                        :class="[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                          balance.liquid.balance === 0n
                            ? 'bg-muted text-muted-foreground border-transparent'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        ]"
                      >
                        Liquid
                      </span>
                      <span
                        :class="[
                          'font-medium tabular-nums',
                          balance.liquid.balance === 0n ? 'text-muted-foreground' : 'text-foreground'
                        ]"
                      >
                        {{ balance.liquid.displayBalance }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between gap-3">
                      <span
                        :class="[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                          balance.vesting.balance === 0n
                            ? 'bg-muted text-muted-foreground border-transparent'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        ]"
                      >
                        Staked
                      </span>
                      <span
                        :class="[
                          'font-medium tabular-nums',
                          balance.vesting.balance === 0n ? 'text-muted-foreground' : 'text-foreground'
                        ]"
                      >
                        {{ balance.vesting.displayBalance }}
                      </span>
                    </div>

                    <template v-if="balance.liquid.balance > 0n || balance.vesting.balance > 0n">
                      <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full bg-emerald-500 transition-all"
                          :style="{ width: `${(balance.liquid.balance * 100n / (balance.liquid.balance + balance.vesting.balance))}%` }"
                        />
                        <div
                          class="h-full bg-sky-500 transition-all"
                          :style="{ width: `${(balance.vesting.balance * 100n / (balance.liquid.balance + balance.vesting.balance))}%` }"
                        />
                      </div>
                      <div class="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Distribution</span>
                        <span class="tabular-nums">
                          {{ (Number((balance.liquid.balance * 10000n / (balance.liquid.balance + balance.vesting.balance))) / 100).toFixed(1) }}% liquid ·
                          {{ (Number((balance.vesting.balance * 10000n / (balance.liquid.balance + balance.vesting.balance))) / 100).toFixed(1) }}% staked
                        </span>
                      </div>
                    </template>

                    <div
                      v-else
                      class="text-xs text-muted-foreground text-right"
                    >
                      No balance yet
                    </div>
                  </div>
                </td>

                <!-- Total Balance -->
                <td class="p-4 text-right">
                  <div class="font-semibold tabular-nums">
                    {{ balance.displayTotal }}
                  </div>
                </td>

                <!-- Actions -->
                <td v-if="showActions" class="p-4">
                  <div class="flex justify-end gap-1">
                    <TextTooltip
                      content="Transfer tokens"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        :disabled="balance.liquid.balance === 0n"
                        @click.prevent="handleTransfer(balance.liquid)"
                      >
                        <svg
                          width="14"
                          height="14"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path
                            style="fill: currentColor"
                            :d="mdiSend"
                          />
                        </svg>
                      </Button>
                    </TextTooltip>

                    <TextTooltip
                      content="Stake tokens"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        :disabled="balance.liquid.balance === 0n"
                        @click.prevent="handleStake(balance.liquid)"
                      >
                        <svg
                          width="14"
                          height="14"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path
                            style="fill: currentColor"
                            :d="mdiArrowUp"
                          />
                        </svg>
                      </Button>
                    </TextTooltip>

                    <TextTooltip
                      content="Unstake tokens"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        :disabled="balance.vesting.balance === 0n"
                        @click.prevent="handleUnstake(balance.vesting)"
                      >
                        <svg
                          width="14"
                          height="14"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path
                            style="fill: currentColor"
                            :d="mdiArrowDown"
                          />
                        </svg>
                      </Button>
                    </TextTooltip>
                  </div>
                </td>
              </NuxtLink>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</template>
