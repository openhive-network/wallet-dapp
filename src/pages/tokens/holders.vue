<script setup lang="ts">
import {
  mdiAccountGroup,
  mdiTrophy,
  mdiCrown
} from '@mdi/js';
import { computed, onMounted, ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore } from '@/stores/tokens.store';
import { formatCTokenAmount, type CTokenTopHolder } from '@/utils/ctokens-api';
import { toastError } from '@/utils/parse-error';

const tokensStore = useTokensStore();

// State
const holders = ref<CTokenTopHolder[]>([]);
const isLoading = ref(false);
const selectedToken = ref<string>('');
const selectedPrecision = ref<number>(3);
const currentPage = ref(1);
const hasMorePages = ref(true);

// Computed
const availableTokens = computed(() => {
  return tokensStore.tokenDefinitions.map(token => ({
    value: `${token.nai}:${token.precision}`,
    label: `${token.symbol} (${token.nai})`,
    nai: token.nai,
    precision: token.precision
  }));
});

const selectedTokenInfo = computed(() => {
  if (!selectedToken.value) return null;
  const [nai] = selectedToken.value.split(':');
  return tokensStore.tokenDefinitions.find(t => t.nai === nai);
});

const formattedHolders = computed(() => {
  return holders.value.map(holder => ({
    ...holder,
    formattedAmount: formatCTokenAmount(holder.amount, selectedPrecision.value),
    percentage: calculatePercentage(holder.amount),
    displayName: getDisplayName(holder)
  }));
});

// Methods
const calculatePercentage = (amount: string): number => {
  if (!selectedTokenInfo.value) return 0;
  const totalSupply = parseFloat(selectedTokenInfo.value.current_supply);
  const holderAmount = parseFloat(formatCTokenAmount(amount, selectedPrecision.value));
  return totalSupply > 0 ? (holderAmount / totalSupply) * 100 : 0;
};

const getDisplayName = (holder: CTokenTopHolder): string => {
  // Try to get name from metadata, fallback to user key
  const metadata = holder.metadata as { name?: string; display_name?: string } | undefined;
  return metadata?.display_name || metadata?.name || holder.user;
};

const loadTopHolders = async (page = 1) => {
  if (!selectedToken.value) return;

  try {
    isLoading.value = true;

    const [nai, precision] = selectedToken.value.split(':');
    const newHolders = await tokensStore.getTopHolders(nai, parseInt(precision), page);

    if (page === 1)
      holders.value = newHolders;
    else
      holders.value.push(...newHolders);

    hasMorePages.value = newHolders.length === 100; // API returns 100 results per page
    currentPage.value = page;
  } catch (error) {
    toastError('Failed to load top holders', error);
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMorePages.value || isLoading.value) return;
  await loadTopHolders(currentPage.value + 1);
};

const refresh = async () => {
  currentPage.value = 1;
  hasMorePages.value = true;
  await loadTopHolders(1);
};

const onTokenChange = (value: string) => {
  selectedToken.value = value;
  const [, precision] = value.split(':');
  selectedPrecision.value = parseInt(precision);
  holders.value = [];
  currentPage.value = 1;
  hasMorePages.value = true;
  loadTopHolders(1);
};

// Initialize
onMounted(async () => {
  await tokensStore.loadTokenDefinitions();

  // Auto-select first token if available
  if (availableTokens.value.length > 0)
    onTokenChange(availableTokens.value[0].value);
});
</script>

<template>
  <div class="container mx-auto py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          Top Token Holders
        </h1>
        <p class="text-muted-foreground">
          View the largest holders of custom tokens on Hive Token Machine
        </p>
      </div>
    </div>

    <!-- Token Selection -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path
              style="fill: currentColor"
              :d="mdiTrophy"
            />
          </svg>
          Select Token
        </CardTitle>
        <CardDescription>
          Choose a token to view its top holders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <Select
              :value="selectedToken"
              @update:value="onTokenChange"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a token..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="token in availableTokens"
                  :key="token.value"
                  :value="token.value"
                >
                  {{ token.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            :disabled="!selectedToken || isLoading"
            @click="refresh"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-1"
              :class="{ 'animate-spin': isLoading }"
            >
              <path
                style="fill: currentColor"
                d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"
              />
            </svg>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Token Info -->
    <Card v-if="selectedTokenInfo">
      <CardContent class="pt-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold">
              {{ selectedTokenInfo.symbol }}
            </div>
            <div class="text-sm text-muted-foreground">
              Token Symbol
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">
              {{ parseFloat(selectedTokenInfo.current_supply).toLocaleString() }}
            </div>
            <div class="text-sm text-muted-foreground">
              Total Supply
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">
              {{ holders.length }}
            </div>
            <div class="text-sm text-muted-foreground">
              Top Holders Shown
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">
              {{ selectedTokenInfo.precision }}
            </div>
            <div class="text-sm text-muted-foreground">
              Decimal Places
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Loading State -->
    <div
      v-if="isLoading && holders.length === 0"
      class="space-y-3"
    >
      <Card
        v-for="i in 10"
        :key="i"
      >
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Skeleton class="h-8 w-8 rounded-full" />
              <div class="space-y-2">
                <Skeleton class="h-4 w-[150px]" />
                <Skeleton class="h-3 w-[100px]" />
              </div>
            </div>
            <div class="text-right space-y-2">
              <Skeleton class="h-4 w-[100px]" />
              <Skeleton class="h-3 w-[60px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Top Holders List -->
    <div
      v-else-if="formattedHolders.length > 0"
      class="space-y-3"
    >
      <Card
        v-for="holder in formattedHolders"
        :key="holder.user"
        class="hover:shadow-md transition-shadow"
      >
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Rank Badge -->
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white"
                :class="{
                  'bg-yellow-500': holder.rank === 1,
                  'bg-gray-400': holder.rank === 2,
                  'bg-orange-600': holder.rank === 3,
                  'bg-blue-500': holder.rank > 3
                }"
              >
                <svg
                  v-if="holder.rank === 1"
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiCrown"
                  />
                </svg>
                <span v-else>{{ holder.rank }}</span>
              </div>

              <!-- Holder Info -->
              <div>
                <div class="font-semibold">
                  {{ holder.displayName }}
                </div>
                <div class="text-sm text-muted-foreground">
                  Rank #{{ holder.rank }} • {{ holder.percentage.toFixed(2) }}% of supply
                </div>
              </div>
            </div>

            <!-- Amount -->
            <div class="text-right">
              <div class="font-bold text-lg">
                {{ parseFloat(holder.formattedAmount).toLocaleString() }}
              </div>
              <div class="text-sm text-muted-foreground">
                {{ selectedTokenInfo?.symbol }}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Load More Button -->
      <div
        v-if="hasMorePages"
        class="text-center pt-4"
      >
        <Button
          variant="outline"
          :disabled="isLoading"
          @click="loadMore"
        >
          <svg
            v-if="isLoading"
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mr-2 animate-spin"
          >
            <path
              style="fill: currentColor"
              d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"
            />
          </svg>
          {{ isLoading ? 'Loading...' : 'Load More' }}
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <Card v-else-if="selectedToken && !isLoading">
      <CardContent class="text-center py-12">
        <svg
          width="64"
          height="64"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mx-auto text-muted-foreground mb-4"
        >
          <path
            style="fill: currentColor"
            :d="mdiAccountGroup"
          />
        </svg>
        <h3 class="text-lg font-semibold mb-2">
          No Holders Found
        </h3>
        <p class="text-muted-foreground mb-4">
          This token doesn't have any registered holders yet.
        </p>
      </CardContent>
    </Card>

    <!-- No Token Selected -->
    <Card v-else-if="!selectedToken && !isLoading">
      <CardContent class="text-center py-12">
        <svg
          width="64"
          height="64"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mx-auto text-muted-foreground mb-4"
        >
          <path
            style="fill: currentColor"
            :d="mdiTrophy"
          />
        </svg>
        <h3 class="text-lg font-semibold mb-2">
          Select a Token
        </h3>
        <p class="text-muted-foreground">
          Choose a token from the dropdown above to view its top holders.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
