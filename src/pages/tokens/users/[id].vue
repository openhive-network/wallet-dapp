<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';

import HTMTokenBalancesTable from '@/components/htm/HTMTokenBalancesTable.vue';
import HTMUserHeader from '@/components/htm/HTMUserHeader.vue';
import HTMUserKeys from '@/components/htm/HTMUserKeys.vue';
import HTMUserMetadata from '@/components/htm/HTMUserMetadata.vue';
import HTMView from '@/components/htm/HTMView.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokensStore, type CTokenUser, type CTokenPairBalanceDefinition } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

// Router
const route = useRoute();

// Stores
const tokensStore = useTokensStore();

// State
const user = ref<CTokenUser | null>(null);
const userBalances = ref<CTokenPairBalanceDefinition[]>([]);
const isLoading = ref(true);
const isLoadingBalances = ref(false);

// Get operational key from route parameter
const operationalKey = computed(() => decodeURIComponent(route.params.id as string));

// Load user details
const loadUserDetails = async () => {
  try {
    user.value = await tokensStore.getUser(operationalKey.value);
  } catch (error) {
    toastError('Failed to load user details', error);
  }
};

// Load user token balances
const loadUserBalances = async () => {
  if (!user.value) return;

  try {
    isLoadingBalances.value = true;
    const balances = await tokensStore.getBalance(user.value.operationalKey, undefined, 1);
    userBalances.value = balances.items.filter(b => b.total > 0n);
  } catch {
    // Silently fail - user might not have any balances
    userBalances.value = [];
  } finally {
    isLoadingBalances.value = false;
  }
};

// Initialize
onMounted(async () => {
  isLoading.value = true;
  await loadUserDetails();
  if (user.value)
    await loadUserBalances();

  isLoading.value = false;
});
</script>

<template>
  <HTMView is-public-page>
    <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4">
      <!-- Header with back button -->
      <div class="flex items-center justify-between gap-4">
        <NuxtLink to="/tokens/users" class="keychainify-checked">
          <Button
            variant="ghost"
            size="sm"
            class="gap-2 hover:bg-accent"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="flex-shrink-0"
            >
              <path
                style="fill: currentColor"
                d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"
              />
            </svg>
            Back to Users
          </Button>
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="space-y-6"
      >
        <Card>
          <CardHeader class="pb-6">
            <div class="flex flex-col md:flex-row items-start gap-6">
              <Skeleton class="h-32 w-32 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-4 w-full">
                <Skeleton class="h-10 w-64" />
                <Skeleton class="h-5 w-full max-w-md" />
                <div class="flex gap-2">
                  <Skeleton class="h-8 w-20" />
                  <Skeleton class="h-8 w-20" />
                  <Skeleton class="h-8 w-20" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent class="space-y-6">
            <Skeleton class="h-24 w-full" />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton class="h-20 w-full" />
              <Skeleton class="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- User Details -->
      <div
        v-else-if="user"
        class="space-y-6"
      >
        <!-- Main Profile Card -->
        <Card class="overflow-hidden">
          <CardHeader class="pb-6 bg-gradient-to-br from-primary/5 to-primary/10">
            <HTMUserHeader :user="user" />
          </CardHeader>

          <CardContent class="pt-6 space-y-6">
            <HTMUserKeys :user="user" />
          </CardContent>
        </Card>

        <!-- Token Balances -->
        <div v-if="userBalances.length > 0 || isLoadingBalances">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold">Token Holdings</h2>
            <span class="text-sm text-muted-foreground">
              {{ userBalances.length }} {{ userBalances.length === 1 ? 'token' : 'tokens' }}
            </span>
          </div>

          <!-- Loading Skeleton for Table -->
          <Card v-if="isLoadingBalances">
            <CardContent class="p-4 space-y-4">
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-20 w-full" />
              <Skeleton class="h-20 w-full" />
              <Skeleton class="h-20 w-full" />
            </CardContent>
          </Card>

          <!-- Token Balances Table -->
          <HTMTokenBalancesTable
            v-else
            :balances="userBalances"
            :show-actions="false"
          />
        </div>

        <!-- Additional Metadata -->
        <HTMUserMetadata :metadata="user.metadata" />
      </div>

      <!-- Error State -->
      <Card v-else>
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
              d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
            />
          </svg>
          <h3 class="text-lg font-semibold mb-2">
            User Not Found
          </h3>
          <p class="text-muted-foreground mb-4">
            The user you're looking for doesn't exist or has been removed.
          </p>
          <NuxtLink to="/tokens/users" class="keychainify-checked">
            <Button>Back to Users Directory</Button>
          </NuxtLink>
        </CardContent>
      </Card>
    </div>
  </HTMView>
</template>
