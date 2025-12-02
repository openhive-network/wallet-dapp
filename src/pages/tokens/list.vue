<script setup lang="ts">
import { mdiRefresh, mdiPlus, mdiCloseCircle } from '@mdi/js';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import HTMTokenCard from '@/components/htm/HTMTokenCard.vue';
import HTMView from '@/components/htm/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import TextTooltip from '@/components/ui/texttooltip/TextTooltip.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore, type CTokenDisplayBase, type TokenStoreApiResponse, type CTokenPairDefinition } from '@/stores/tokens.store';
import { debounce } from '@/utils/debouncers';
import { toastError } from '@/utils/parse-error';

// Router
const router = useRouter();
const route = useRoute();

// Store
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();

// State
const searchQuery = ref('');
const showOnlyMyTokens = ref(false);

const isFirstLoad = ref(true);

const tokensList = ref<TokenStoreApiResponse<Partial<CTokenPairDefinition>>>({
  items: [],
  pages: 0,
  page: 0,
  hasMore: false,
  total: 0
});

const searchFn = async (query: string) => {
  try {
    if (query === '')
      return void loadTokens(1);

    updateUrl();

    tokensList.value = await tokensStore.searchTokens(query, tokensList.value.page, showOnlyMyTokens.value ? tokensStore.getUserPublicKey()! : undefined);
  } catch (error) {
    toastError('Failed to search tokens', error);
  }
};
const debouncedSearch = debounce(searchFn);

// Navigate to token detail page (placeholder for now)
const viewTokenDetails = (token: CTokenDisplayBase) => {
  router.push(`/tokens/token?asset-num=${token.assetNum}`);
};

const loadTokens = async (page: number = 1) => {
  try {
    updateUrl();

    const result = await tokensStore.loadTokens(page, showOnlyMyTokens.value ? tokensStore.getUserPublicKey()! : undefined);

    if (result)
      tokensList.value = result;

  } catch (error) {
    toastError('Failed to load tokens', error);
  }
};

const updateUrl = () => {
  const url = new URL(window.location.href);

  if (tokensList.value.page > 1)
    url.searchParams.set('page', String(tokensList.value.page));
  else
    url.searchParams.delete('page');

  if (showOnlyMyTokens.value)
    url.searchParams.set('mytokens', '1');
  else
    url.searchParams.delete('mytokens');

  if (searchQuery.value.trim().length > 0)
    url.searchParams.set('search', searchQuery.value.trim());
  else
    url.searchParams.delete('search');

  window.history.pushState(
    {},
    '',
    url
  );
};

watch(showOnlyMyTokens, () => {
  if (tokensStore.isLoading) return; // Prevent multiple loads

  if (searchQuery.value.trim().length > 0)
    return void searchFn(searchQuery.value);

  void loadTokens(1); // Reset to page 1 when filtering
});

const handlePageChange = (page: number) => {
  if (tokensStore.isLoading) return;

  if (searchQuery.value.trim().length > 0)
    void searchFn(searchQuery.value);
  else
    void loadTokens(page);
};

const clearSearch = () => {
  searchQuery.value = '';
  void loadTokens(1);
};

const refresh = () => {
  if (tokensStore.isLoading) return;
  if (searchQuery.value)
    void searchFn(searchQuery.value);
  else
    void loadTokens(tokensList.value.page);
};

// Initialize
onMounted(() => {
  let page = route.query.page ? Number(route.query.page) : 1;
  if (isNaN(page) || page < 1) page = 1;

  showOnlyMyTokens.value = route.query.mytokens === '1' || route.query.mytokens === 'true';

  if (route.query.search && typeof route.query.search === 'string') {
    searchQuery.value = route.query.search;
    void searchFn(searchQuery.value);
  } else
    void loadTokens(page);

  isFirstLoad.value = false;
});
onUnmounted(() => {
  isFirstLoad.value = true;
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
            @click="refresh"
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

          <TextTooltip
            content="You need to be logged in to create a new token."
            :ignore="!!settingsStore.account"
          >
            <NuxtLink :to="!!settingsStore.account ? '/tokens/create' : ''" class="keychainify-checked">
              <Button
                :disabled="!settingsStore.account"
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
            </NuxtLink>
          </TextTooltip>
        </div>
      </div>

      <!-- Search -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="max-w-[350px] flex-1 relative">
          <Input
            v-model="searchQuery"
            placeholder="Search tokens by symbol, name, or Asset num..."
            class="w-full"
            @input="debouncedSearch(searchQuery)"
          />
          <svg
            v-if="searchQuery.length > 0"
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
            @click="clearSearch"
          >
            <path
              style="fill: currentColor"
              :d="mdiCloseCircle"
            />
          </svg>
        </div>
        <div class="inline-flex items-center gap-2">
          <TextTooltip
            content="You need to be logged in to filter tokens using your account."
            :ignore="!!settingsStore.account"
          >
            <Checkbox
              id="show-my-tokens"
              v-model="showOnlyMyTokens"
              :disabled="!settingsStore.account || tokensStore.isLoading"
              class="w-4 h-4"
            />
            <Label
              for="show-my-tokens"
              class="text-sm cursor-pointer"
            >
              Show my tokens only
            </Label>
          </TextTooltip>
        </div>
      </div>

      <!-- Loading Skeletons -->
      <div
        v-if="isFirstLoad || tokensStore.isLoading && tokensList.total === 0"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
      >
        <Card
          v-for="i in 12"
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

      <!-- Tokens -->
      <div v-else-if="!tokensStore.isLoading" class="flex flex-col gap-4">

        <!-- Tokens Grid -->
        <div v-if="tokensList.items.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <template
            v-for="token in tokensList.items"
            :key="token.liquid?.assetNum || token.vesting?.assetNum"
          >
            <NuxtLink
              v-if="token.liquid"
              :to="`/tokens/token?asset-num=${token.liquid.assetNum}`"
              class="keychainify-checked"
            >
              <HTMTokenCard
                :token="token.liquid"
                class="h-full hover:shadow-lg group"
                @click="viewTokenDetails"
              />
            </NuxtLink>
            <NuxtLink
              v-if="token.vesting"
              :to="`/tokens/token?asset-num=${token.vesting.assetNum}`"
              class="keychainify-checked"
            >
              <HTMTokenCard
                :token="token.vesting"
                class="h-full hover:shadow-lg group"
                @click="viewTokenDetails"
              />
            </NuxtLink>
          </template>
        </div>

        <!-- Pagination -->
        <div v-if="tokensList.items.length > 0" class="flex justify-center pt-6">
          <Pagination
            :current-page="tokensList.page"
            :total-pages="tokensList.pages"
            :loading="tokensStore.isLoading"
            @page-change="handlePageChange"
          />
        </div>

        <!-- Empty State -->
        <Card v-else-if="tokensList.items.length === 0">
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
              <span v-if="searchQuery.length > 0">There are no tokens matching your search.</span>
              <span v-else>There are no registered tokens available at the moment.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </HTMView>
</template>
