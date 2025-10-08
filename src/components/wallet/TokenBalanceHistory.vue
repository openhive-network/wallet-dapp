<script setup lang="ts">
import {
  mdiHistory,
  mdiArrowUp,
  mdiArrowDown,
  mdiMinus
} from '@mdi/js';
import { computed, onMounted, ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore } from '@/stores/tokens.store';
import { formatCTokenAmount, type CTokenBalanceHistory, type LegacyTokenBalance } from '@/utils/ctokens-api';
import { toastError } from '@/utils/parse-error';

interface Props {
  token: LegacyTokenBalance;
}

const props = defineProps<Props>();
const tokensStore = useTokensStore();

// State
const history = ref<CTokenBalanceHistory[]>([]);
const isLoading = ref(false);
const currentPage = ref(1);
const hasMorePages = ref(true);

// Computed
const formattedHistory = computed(() => {
  return history.value.map(entry => {
    const balanceChange = parseFloat(entry.balance_change);
    const isPositive = balanceChange > 0;
    const isNegative = balanceChange < 0;

    return {
      ...entry,
      formattedBalance: formatCTokenAmount(entry.balance, props.token.precision),
      formattedPrevBalance: formatCTokenAmount(entry.prev_balance, props.token.precision),
      formattedBalanceChange: formatCTokenAmount(Math.abs(balanceChange).toString(), props.token.precision),
      changeDirection: isPositive ? 'increase' : isNegative ? 'decrease' : 'neutral',
      changeIcon: isPositive ? mdiArrowUp : isNegative ? mdiArrowDown : mdiMinus,
      changeColor: isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground',
      formattedDate: new Date(entry.timestamp).toLocaleDateString(),
      formattedTime: new Date(entry.timestamp).toLocaleTimeString()
    };
  });
});

// Methods
const loadHistory = async (page = 1) => {
  try {
    isLoading.value = true;

    const newHistory = await tokensStore.getBalanceHistory(
      props.token.nai,
      props.token.precision,
      page
    );

    if (page === 1)
      history.value = newHistory;
    else
      history.value.push(...newHistory);

    hasMorePages.value = newHistory.length === 100; // API returns 100 results per page
    currentPage.value = page;
  } catch (error) {
    toastError('Failed to load balance history', error);
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMorePages.value || isLoading.value) return;
  await loadHistory(currentPage.value + 1);
};

const refresh = async () => {
  currentPage.value = 1;
  hasMorePages.value = true;
  await loadHistory(1);
};

// Initialize
onMounted(() => {
  loadHistory();
});
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                style="fill: currentColor"
                :d="mdiHistory"
              />
            </svg>
            Balance History
          </CardTitle>
          <CardDescription>
            Transaction history for {{ token.symbol }} ({{ token.nai }})
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          :disabled="isLoading"
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
    </CardHeader>
    <CardContent>
      <!-- Loading State -->
      <div
        v-if="isLoading && history.length === 0"
        class="space-y-3"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center justify-between p-3 border rounded-lg"
        >
          <div class="space-y-2">
            <Skeleton class="h-4 w-[120px]" />
            <Skeleton class="h-3 w-[80px]" />
          </div>
          <div class="text-right space-y-2">
            <Skeleton class="h-4 w-[100px]" />
            <Skeleton class="h-3 w-[60px]" />
          </div>
        </div>
      </div>

      <!-- History Items -->
      <div
        v-else-if="formattedHistory.length > 0"
        class="space-y-3"
      >
        <div
          v-for="entry in formattedHistory"
          :key="entry.history_seq_no"
          class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="p-2 rounded-full"
              :class="entry.changeDirection === 'increase' ? 'bg-green-100 text-green-600' :
                entry.changeDirection === 'decrease' ? 'bg-red-100 text-red-600' :
                'bg-gray-100 text-gray-600'"
            >
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="entry.changeIcon"
                />
              </svg>
            </div>
            <div>
              <div class="font-medium">
                <span v-if="entry.changeDirection === 'increase'">Received</span>
                <span v-else-if="entry.changeDirection === 'decrease'">Sent</span>
                <span v-else>No Change</span>
                <span
                  class="ml-1"
                  :class="entry.changeColor"
                >
                  {{ entry.formattedBalanceChange }} {{ token.symbol }}
                </span>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ entry.formattedDate }} at {{ entry.formattedTime }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-medium">
              {{ entry.formattedBalance }} {{ token.symbol }}
            </div>
            <div class="text-sm text-muted-foreground">
              Balance
            </div>
          </div>
        </div>

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
      <div
        v-else
        class="text-center py-8"
      >
        <svg
          width="48"
          height="48"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mx-auto text-muted-foreground mb-3"
        >
          <path
            style="fill: currentColor"
            :d="mdiHistory"
          />
        </svg>
        <p class="text-muted-foreground">
          No transaction history found for this token.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
