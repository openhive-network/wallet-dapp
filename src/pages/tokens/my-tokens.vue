<script setup lang="ts">
import {
  mdiCurrencyUsd,
  mdiRefresh,
  mdiPlus
} from '@mdi/js';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import HTMTokenCard from '@/components/htm/HTMTokenCard.vue';
import HTMView from '@/components/htm/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

const router = useRouter();

// Stores
const tokensStore = useTokensStore();

// State
const isLoading = ref(false);
const currentPage = ref(0);
const hasMorePages = ref(true);

// Navigate to token detail page
const viewTokenDetails = (token: CTokenDefinitionDisplay) => {
  router.push(`/tokens/token?asset-num=${token.assetNum}`);
};

// Load tokens filtered by user's public key
const loadTokens = async (page: number = 1) => {
  try {
    isLoading.value = true;

    const createdTokens = await tokensStore.loadCreatedTokens(page);

    hasMorePages.value = createdTokens.hasMore;
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

// Navigate to create token page
const createNewToken = () => {
  router.push('/tokens/create');
};

// Lifecycle
onMounted(() => {
  loadMore();
});
</script>

<template>
  <HTMView>
    <div class="container mx-auto py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            My Custom Tokens
          </h1>
          <p class="text-muted-foreground">
            View your custom tokens on Hive Token Machine
          </p>
        </div>

        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="isLoading"
            @click="loadMore"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              :class="{ 'animate-spin': isLoading }"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiRefresh"
              />
            </svg>
            Refresh
          </Button>

          <Button @click="createNewToken">
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiPlus"
              />
            </svg>
            Create Token
          </Button>
        </div>
      </div>

      <!-- Loading Skeletons -->
      <div
        v-if="isLoading && tokensStore.fungibleTokensCreatedByUser.length === 0"
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
        v-else-if="tokensStore.fungibleTokensCreatedByUser.length > 0"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div
          v-for="token in tokensStore.fungibleTokensCreatedByUser"
          :key="token.liquid.assetNum"
          class="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <HTMTokenCard
            :key="token.liquid.assetNum"
            :token="token.liquid"
            @click="viewTokenDetails"
          />
          <HTMTokenCard
            :key="token.vesting.assetNum"
            :token="token.vesting"
            @click="viewTokenDetails"
          />
        </div>
      </div>

      <!-- Load More Button -->
      <div
        v-if="tokensStore.fungibleTokensCreatedByUser.length > 0 && hasMorePages"
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
      <Card v-else-if="tokensStore.fungibleTokensCreatedByUser.length === 0 && !isLoading">
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
              :d="mdiCurrencyUsd"
            />
          </svg>
          <h3 class="text-lg font-semibold mb-2">
            No tokens created yet
          </h3>
          <p class="text-muted-foreground mb-6">
            Create your first custom token to get started
          </p>
          <Button @click="createNewToken">
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiPlus"
              />
            </svg>
            Create Your First Token
          </Button>
        </CardContent>
      </Card>
    </div>
  </HTMView>
</template>
