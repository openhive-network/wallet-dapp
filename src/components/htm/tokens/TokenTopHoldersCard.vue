<script setup lang="ts">
import { mdiStar, mdiStarOutline } from '@mdi/js';
import { toast } from 'vue-sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button as CopyButton } from '@/components/ui/copybutton';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFavoritesStore } from '@/stores/favorites.store';
import type { CTokenDefinitionDisplay, CTokenUserRanked } from '@/stores/tokens.store';

const props = defineProps<{
  token: CTokenDefinitionDisplay;
  topHolders: CTokenUserRanked[];
  isLoadingHolders: boolean;
}>();

const favoritesStore = useFavoritesStore();

const toggleFavorite = (holder: CTokenUserRanked, event: Event) => {
  event.preventDefault();
  event.stopPropagation();

  const isFavorited = favoritesStore.isAccountFavorited(holder.operationalKey);

  if (isFavorited) {
    favoritesStore.removeAccountFromFavorites(holder.operationalKey);
    toast.success('Removed from favorites', {
      description: `${holder.displayName} has been removed from your favorites`
    });
  } else {
    favoritesStore.addAccountToFavorites({
      operationalKey: holder.operationalKey,
      displayName: holder.displayName,
      name: holder.name,
      profileImage: holder.profileImage,
      about: holder.about
    });
    toast.success('Added to favorites', {
      description: `${holder.displayName} has been added to your favorites`
    });
  }
};
</script>

<template>
  <Card class="flex flex-col h-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="text-primary"
        >
          <path
            style="fill: currentColor"
            d="M16,4C18.11,4 19.81,5.69 19.81,7.8C19.81,9.91 18.11,11.6 16,11.6C13.89,11.6 12.19,9.91 12.19,7.8C12.19,5.69 13.89,4 16,4M16,13.4C18.67,13.4 24,14.73 24,17.4V20H8V17.4C8,14.73 13.33,13.4 16,13.4M8.31,12.7C7.75,12.26 7.12,11.96 6.44,11.84C6.95,11.11 7.31,10.3 7.31,9.36C7.31,7.93 6.75,6.64 5.44,5.9C4.95,5.66 4.41,5.5 3.91,5.44C4.2,5.16 4.53,4.93 4.9,4.76C5.27,4.6 5.66,4.5 6.06,4.5C7.84,4.5 9.19,5.96 9.19,7.8C9.19,9.64 7.84,11.1 6.06,11.1C5.66,11.1 5.27,11 4.9,10.84C5.27,11.01 5.66,11.1 6.06,11.1C6.75,11.1 7.39,10.9 7.94,10.54C8.07,11.13 8.18,11.88 8.31,12.7M6.56,13.4C4.17,13.4 0,14.73 0,17.4V20H6V17.4C6,15.77 6.91,14.32 8.31,13.4H6.56Z"
          />
        </svg>
        Top Holders
      </CardTitle>
      <CardDescription>
        Accounts with the largest {{ props.token.symbol || props.token.name }} balances
      </CardDescription>
    </CardHeader>
    <CardContent class="flex-1">
      <div
        v-if="props.isLoadingHolders"
        class="space-y-4"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center gap-4 p-3 rounded-lg border animate-pulse"
        >
          <Skeleton class="h-10 w-10 rounded-full flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-3 w-24" />
          </div>
          <div class="text-right space-y-2">
            <Skeleton class="h-4 w-20" />
            <Skeleton class="h-3 w-16" />
          </div>
        </div>
      </div>

      <div
        v-else-if="props.topHolders.length > 0"
        class="space-y-2"
      >
        <NuxtLink
          v-for="(holder, index) in props.topHolders.slice(0, 10)"
          :key="holder.operationalKey"
          :to="`/tokens/users/${holder.operationalKey}`"
          class="flex items-center gap-2 sm:gap-4 p-3 rounded-lg border hover:border-primary/20 hover:bg-accent/50 transition-colors group"
        >
          <div class="relative flex-shrink-0">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-bold text-primary border-2 border-primary/20">
              {{ index + 1 }}
            </div>
            <div
              v-if="index < 3"
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
              :class="{
                'bg-yellow-500 text-yellow-50': index === 0,
                'bg-gray-400 text-gray-50': index === 1,
                'bg-amber-600 text-amber-50': index === 2
              }"
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center gap-1">
              <p class="font-semibold text-foreground truncate">
                {{ holder.displayName }}
              </p>
              <div class="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger @click.stop.prevent>
                      <CopyButton :value="holder.operationalKey" @click.stop.prevent />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy holder address</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        class="inline-flex items-center justify-center p-2 rounded-md transition-colors hover:bg-accent"
                        @click="(e) => toggleFavorite(holder, e)"
                      >
                        <svg
                          width="16"
                          height="16"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          :class="favoritesStore.isAccountFavorited(holder.operationalKey) ? 'text-yellow-500' : 'text-muted-foreground'"
                        >
                          <path
                            style="fill: currentColor"
                            :d="favoritesStore.isAccountFavorited(holder.operationalKey) ? mdiStar : mdiStarOutline"
                          />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{{ favoritesStore.isAccountFavorited(holder.operationalKey) ? 'Remove from favorites' : 'Add to favorites' }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <p class="text-sm text-muted-foreground">
              Rank #{{ holder.rank }}
            </p>
          </div>

          <div class="text-right flex-shrink-0">
            <p class="font-bold text-foreground">
              {{ holder.displayAmount }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ props.token.symbol || 'tokens' }}
            </p>
          </div>
        </NuxtLink>
      </div>

      <div
        v-else
        class="text-center py-12 space-y-4"
      >
        <div class="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <svg
            width="24"
            height="24"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="text-muted-foreground"
          >
            <path
              style="fill: currentColor"
              d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17.3C9.5,17.3 7.45,15.25 7.45,12.75C7.45,10.25 9.5,8.2 12,8.2C14.5,8.2 16.55,10.25 16.55,12.75C16.55,15.25 14.5,17.3 12,17.3M12,10.7C10.83,10.7 9.95,11.58 9.95,12.75C9.95,13.92 10.83,14.8 12,14.8C13.17,14.8 14.05,13.92 14.05,12.75C14.05,11.58 13.17,10.7 12,10.7Z"
            />
          </svg>
        </div>
        <div>
          <p class="font-medium text-foreground mb-1">
            No holder data available
          </p>
          <p class="text-sm text-muted-foreground">
            Top holders information is not available for this token
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
