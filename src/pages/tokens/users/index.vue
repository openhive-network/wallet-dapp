<script setup lang="ts">
import { mdiRefresh, mdiCloseCircle } from '@mdi/js';
import { onMounted, ref, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

import HTMUserCard from '@/components/htm/HTMUserCard.vue';
import HTMView from '@/components/htm/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore, type CTokenUser, type TokenStoreApiResponse } from '@/stores/tokens.store';
import { debounce } from '@/utils/debouncers';
import { toastError } from '@/utils/parse-error';

// Router
const route = useRoute();

// Store
const tokensStore = useTokensStore();

// State
const searchQuery = ref('');
const isFirstLoad = ref(true);

const usersList = ref<TokenStoreApiResponse<CTokenUser>>({
  items: [],
  pages: 0,
  page: 0,
  hasMore: false,
  total: 0
});

const searchFn = async (query: string) => {
  try {
    if (query === '')
      return void loadUsers(1);

    updateUrl();

    usersList.value = await tokensStore.searchUsers(query, usersList.value.page);
  } catch (error) {
    toastError('Failed to search users', error);
  }
};
const debouncedSearch = debounce(searchFn);

const loadUsers = async (page: number = 1) => {
  try {
    updateUrl();

    const result = await tokensStore.loadUsers(page);

    if (result)
      usersList.value = result;

  } catch (error) {
    toastError('Failed to load users', error);
  }
};

const updateUrl = () => {
  const url = new URL(window.location.href);

  if (usersList.value.page > 1)
    url.searchParams.set('page', String(usersList.value.page));
  else
    url.searchParams.delete('page');

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

const loadMore = () => {
  if (tokensStore.isLoading) return;
  void loadUsers(usersList.value.page + 1);
};

const clearSearch = () => {
  searchQuery.value = '';
  void loadUsers(1);
};

const refresh = () => {
  if (tokensStore.isLoading) return;
  if (searchQuery.value)
    void searchFn(searchQuery.value);
  else
    void loadUsers(usersList.value.page);
};

// Initialize
onMounted(() => {
  let page = route.query.page ? Number(route.query.page) : 1;
  if (isNaN(page) || page < 1) page = 1;

  if (route.query.search && typeof route.query.search === 'string') {
    searchQuery.value = route.query.search;
    void searchFn(searchQuery.value);
  } else
    void loadUsers(page);

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
            Users Directory
          </h1>
          <p class="text-muted-foreground">
            Browse all registered users on Hive Token Machine
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
        </div>
      </div>

      <!-- Search -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="max-w-[350px] flex-1 relative">
          <Input
            v-model="searchQuery"
            placeholder="Search users by name or bio..."
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
      </div>

      <!-- Loading Skeletons -->
      <div
        v-if="isFirstLoad || tokensStore.isLoading && usersList.total === 0"
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
                <Skeleton class="h-4 w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-4/6" />
            <div class="pt-3 space-y-2">
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Users -->
      <div v-else-if="!tokensStore.isLoading" class="flex flex-col gap-4">

        <!-- Users Grid -->
        <div v-if="usersList.items.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <NuxtLink
            v-for="user in usersList.items"
            :key="user.operationalKey"
            :to="`/tokens/users/${encodeURIComponent(user.operationalKey)}`"
            class="keychainify-checked"
          >
            <HTMUserCard
              :user="user"
              class="h-full hover:shadow-lg group"
            />
          </NuxtLink>
        </div>

        <!-- Load More Button -->
        <div
          v-if="usersList.hasMore"
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
            {{ tokensStore.isLoading ? 'Loading...' : 'Load More Users' }}
          </Button>
        </div>

        <!-- Empty State -->
        <Card v-if="usersList.items.length === 0">
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
                d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
              />
            </svg>
            <h3 class="text-lg font-semibold mb-2">
              No Users Found
            </h3>
            <p class="text-muted-foreground">
              <span v-if="searchQuery.length > 0">There are no users matching your search.</span>
              <span v-else>There are no registered users available at the moment.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </HTMView>
</template>
