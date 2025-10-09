<script setup lang="ts">
import {
  mdiCurrencyUsd,
  mdiRefresh,
  mdiPlus
} from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import TokenCard from '@/components/TokenCard.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

const router = useRouter();
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();

// State
const isLoading = ref(true);
const searchQuery = ref('');

// Computed
const filteredTokens = computed(() => {
  if (!searchQuery.value.trim()) return tokensStore.tokenDefinitions;

  const query = searchQuery.value.toLowerCase();
  return tokensStore.tokenDefinitions.filter(token =>
    token.name.toLowerCase().includes(query) ||
    token.symbol.toLowerCase().includes(query) ||
    token.nai.toLowerCase().includes(query)
  );
});

// Load token definitions
const loadTokenDefinitions = async () => {
  isLoading.value = true;

  try {
    await tokensStore.loadTokenDefinitions(settingsStore.settings.account, true);
  } catch (error) {
    toastError('Failed to load token definitions', error);
  } finally {
    isLoading.value = false;
  }
};

// Navigate to create token page
const createNewToken = () => {
  router.push('/finances/create-token');
};

// Lifecycle
onMounted(() => {
  loadTokenDefinitions();
});
</script>

<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            My Token Definitions
          </h1>
          <p class="text-muted-foreground">
            Manage and view your custom tokens on Hive Token Machine
          </p>
        </div>

        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="isLoading"
            @click="loadTokenDefinitions"
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

      <!-- Search -->
      <div class="max-w-md">
        <Input
          v-model="searchQuery"
          placeholder="Search tokens by name, symbol, or NAI..."
          class="w-full"
        />
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <Card
          v-for="i in 3"
          :key="i"
        >
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="space-y-2 flex-1">
                <Skeleton class="h-4 w-[200px]" />
                <Skeleton class="h-3 w-[100px]" />
              </div>
              <Skeleton class="h-6 w-[80px]" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-2/3" />
              <div class="flex justify-between">
                <Skeleton class="h-3 w-[80px]" />
                <Skeleton class="h-3 w-[60px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        v-else-if="tokensStore.tokenDefinitions.length === 0"
        class="text-center py-12"
      >
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
      </div>

      <!-- No Search Results -->
      <div
        v-else-if="filteredTokens.length === 0"
        class="text-center py-12"
      >
        <h3 class="text-lg font-semibold mb-2">
          No tokens found
        </h3>
        <p class="text-muted-foreground">
          Try adjusting your search criteria
        </p>
      </div>

      <!-- Token Grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <TokenCard
          v-for="token in filteredTokens"
          :key="token.nai"
          :token="token"
        />
      </div>

      <!-- Summary Stats -->
      <div
        v-if="tokensStore.tokenDefinitions.length > 0"
        class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t"
      >
        <Card>
          <CardContent class="pt-6">
            <div class="text-center">
              <div class="text-2xl font-bold">
                {{ tokensStore.tokenDefinitions.length }}
              </div>
              <div class="text-sm text-muted-foreground">
                Total Tokens
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="pt-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">
                {{ tokensStore.tokenDefinitions.filter(t => t.active).length }}
              </div>
              <div class="text-sm text-muted-foreground">
                Active Tokens
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="pt-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">
                {{ tokensStore.tokenDefinitions.filter(t => t.can_stake).length }}
              </div>
              <div class="text-sm text-muted-foreground">
                Stakeable Tokens
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
