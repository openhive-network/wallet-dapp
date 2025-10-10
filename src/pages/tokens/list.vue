<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import HTMTokenCard, { type CToken } from '@/components/HTMTokenCard.vue';
import HTMView from '@/components/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';

// Router
const router = useRouter();

// State
const tokensFullList = ref<CToken[]>([]);
const isLoading = ref(false);
const currentPage = ref(0);
const hasMorePages = ref(true);

// Navigate to token detail page (placeholder for now)
const viewTokenDetails = (token: CToken) => {
  router.push(`/tokens/token?nai=${token.nai}&precision=${token.precision}`);
};

const loadTokens = async (page: number = 1) => {
  try {
    isLoading.value = true;

    const wax = await getWax();
    const formatAsset = (value: string | bigint, precision: number, name?: string): string => {
      const formatted = wax.formatter.formatNumber(value, precision);

      return name ? `${formatted} ${name}` : formatted;
    };
    // Temporary naive implementation of vesting space check
    const isVesting = (nai: string, precision: number) => (((Number(nai.slice(2, -1)) << 5) | 0x10 | precision) & 0x20) != 0;

    const tokens = await wax.restApi.ctokensApi.registeredTokens({}) as Required<CtokensAppToken>[];

    tokensFullList.value.push(...tokens.map(token => {
      const { name, description, website, image } = (token.metadata || {}) as Record<string, string>;

      return {
        nai: token.nai,
        isStaked: isVesting(token.nai, token.precision),
        displayMaxSupply: formatAsset(token.max_supply, token.precision, name),
        ownerPublicKey: token.owner,
        precision: token.precision,
        displayTotalSupply: formatAsset(token.total_supply, token.precision, name),
        totalSupply: BigInt(token.total_supply),
        maxSupply: BigInt(token.max_supply),
        capped: token.capped,
        othersCanStake: token.others_can_stake,
        othersCanUnstake: token.others_can_unstake,
        isNft: token.is_nft,
        metadata: token.metadata,
        name,
        description,
        website,
        image
      } as CToken;
    }));

    hasMorePages.value = tokens.length === 100; // API returns 100 results per page
    currentPage.value = page;
  } catch (error) {
    toastError('Failed to load tokens', error);
  } finally {
    isLoading.value = false;
  }
};

const loadMore = () => {
  if (!hasMorePages.value || isLoading.value) return;
  void loadTokens(currentPage.value + 1);
};

// Initialize
onMounted(() => {
  loadMore();
});
</script>

<template>
  <HTMView :is-public-page="true">
    <div class="container mx-auto py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            Custom Tokens
          </h1>
          <p class="text-muted-foreground">
            Browse all registered tokens on Hive Token Machine
          </p>
        </div>
      </div>

      <!-- Loading Skeletons -->
      <div
        v-if="isLoading && tokensFullList.length === 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <Card
          v-for="i in 9"
          :key="i"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start gap-4">
              <Skeleton class="h-12 w-12 rounded-full" />
              <div class="flex-1 space-y-2">
                <Skeleton class="h-5 w-3/4" />
                <Skeleton class="h-4 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <div class="pt-3 space-y-2">
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tokens Grid -->
      <div
        v-else-if="tokensFullList.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <HTMTokenCard
          v-for="token in tokensFullList"
          :key="token.nai"
          :token="token"
          @click="viewTokenDetails"
        />
      </div>

      <!-- Load More Button -->
      <div
        v-if="tokensFullList.length > 0 && hasMorePages"
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
          {{ isLoading ? 'Loading...' : 'Load More Tokens' }}
        </Button>
      </div>

      <!-- Empty State -->
      <Card v-else-if="tokensFullList.length === 0 && !isLoading">
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
              d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M11,7H13V17H11V7Z"
            />
          </svg>
          <h3 class="text-lg font-semibold mb-2">
            No Tokens Found
          </h3>
          <p class="text-muted-foreground">
            There are no registered tokens available at the moment.
          </p>
        </CardContent>
      </Card>
    </div>
  </HTMView>
</template>
