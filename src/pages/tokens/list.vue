<script setup lang="ts">
import { mdiRefresh, mdiPlus } from '@mdi/js';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore, type CTokenDisplayBase } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

import HTMTokenCard from '~/src/components/htm/HTMTokenCard.vue';
import HTMView from '~/src/components/htm/HTMView.vue';

// Router
const router = useRouter();

// Store
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();

// State
const currentPage = ref(0);
const hasMorePages = ref(true);

// Navigate to token detail page (placeholder for now)
const viewTokenDetails = (token: CTokenDisplayBase) => {
  router.push(`/tokens/token?asset-num=${token.assetNum}`);
};

const loadTokens = async (page: number = 1) => {
  try {
    const result = await tokensStore.loadTokens(page);

    if (result) {
      hasMorePages.value = result.hasMore;
      currentPage.value = page;
    }
  } catch (error) {
    toastError('Failed to load tokens', error);
  }
};

const loadMore = () => {
  if (!hasMorePages.value || tokensStore.isLoading) return;
  void loadTokens(currentPage.value + 1);
};

// Navigate to create token page
const createNewToken = () => {
  router.push('/tokens/create');
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
            Tokens List
          </h1>
          <p class="text-muted-foreground">
            Browse all registered tokens on Hive Token Machine
          </p>
        </div>

        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="tokensStore.isLoading"
            @click="loadMore"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              :class="{ 'animate-spin': tokensStore.isLoading }"
              class="mr-2"
            >
              <path
                style="fill: currentColor"
                :d="mdiRefresh"
              />
            </svg>
            Refresh
          </Button>

          <Button
            v-if="settingsStore.account"
            @click="createNewToken"
          >
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
        v-if="tokensStore.isLoading && tokensStore.fungibleTokenDefinitions.length === 0"
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
        v-else-if="tokensStore.fungibleTokenDefinitions.length > 0"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div
          v-for="token in tokensStore.fungibleTokenDefinitions"
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
        v-if="tokensStore.fungibleTokenDefinitions.length > 0 && hasMorePages"
        class="text-center pt-4"
      >
        <Button
          variant="outline"
          :disabled="tokensStore.isLoading"
          @click="loadMore"
        >
          <svg
            v-if="tokensStore.isLoading"
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
          {{ tokensStore.isLoading ? 'Loading...' : 'Load More Tokens' }}
        </Button>
      </div>

      <!-- Empty State -->
      <Card v-else-if="tokensStore.fungibleTokenDefinitions.length === 0 && !tokensStore.isLoading">
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
