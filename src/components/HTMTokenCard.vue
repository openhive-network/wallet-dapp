<script setup lang="ts">
import { mdiInfinity } from '@mdi/js';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CTokenDisplay } from '@/stores/tokens.store';

interface Props {
  token: CTokenDisplay;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [token: CTokenDisplay];
}>();

// Get avatar fallback text
const getAvatarFallback = (token: CTokenDisplay): string => {
  if (token.name)
    return token.name.slice(0, 2).toUpperCase();

  return token.ownerPublicKey.slice(3, 5).toUpperCase();
};

// Handle card click
const handleClick = () => {
  emit('click', props.token);
};
</script>

<template>
  <Card
    class="hover:shadow-lg transition-all cursor-pointer group"
    @click="handleClick"
  >
    <CardHeader class="pb-3">
      <div class="flex items-start gap-4">
        <!-- Token Avatar -->
        <Avatar
          size="sm"
          shape="circle"
        >
          <AvatarImage
            v-if="token.image"
            :src="token.image"
            :alt="token.name || 'Token'"
          />
          <AvatarFallback>
            <svg
              v-if="!token.image"
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="text-muted-foreground"
            >
              <path
                style="fill: currentColor"
                d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M11,7H13V17H11V7Z"
              />
            </svg>
            <span
              v-else
              class="text-sm font-semibold"
            >
              {{ getAvatarFallback(token) }}
            </span>
          </AvatarFallback>
        </Avatar>

        <!-- Token Info -->
        <div class="flex-1 min-w-0">
          <CardTitle class="text-lg truncate flex items-center">
            <span>{{ token.name || 'Unnamed Token' }}</span>
            <span
              v-if="token.isStaked"
              class="ml-2 text-[11px]/[14px] inline-flex items-center rounded-md bg-green-500/10 px-1 font-medium text-green-500 border border-blue-500/20"
            >
              staked
            </span>
          </CardTitle>
          <CardDescription class="text-xs truncate">
            {{ token.nai }}
          </CardDescription>
        </div>

        <!-- View Icon -->
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
        >
          <path
            style="fill: currentColor"
            d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
          />
        </svg>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Description -->
      <p
        v-if="token.description"
        class="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]"
      >
        {{ token.description }}
      </p>
      <p
        v-else
        class="text-sm text-muted-foreground italic min-h-[2.5rem]"
      >
        No description provided
      </p>

      <!-- Token Properties -->
      <div class="space-y-2 text-sm">
        <!-- Supply Info -->
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Total Supply:</span>
          <span class="font-semibold">
            {{ token.displayTotalSupply }}
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Max Supply:</span>
          <span class="font-semibold flex items-center gap-1">
            <template v-if="token.capped">
              {{ token.displayMaxSupply }}
            </template>
            <template v-else>
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiInfinity"
                />
              </svg>
              Unlimited
            </template>
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Precision:</span>
          <span class="font-semibold">{{ token.precision }}</span>
        </div>
      </div>

      <!-- Token Badges -->
      <div class="flex flex-wrap gap-2 pt-2">
        <span
          v-if="token.isNft"
          class="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500 border border-purple-500/20"
        >
          NFT
        </span>
        <span
          v-if="token.othersCanStake"
          class="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 border border-green-500/20"
        >
          <svg
            width="12"
            height="12"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mr-1"
          >
            <path
              style="fill: currentColor"
              d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
            />
          </svg>
          Stakeable
        </span>
        <span
          v-if="token.othersCanUnstake"
          class="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 border border-blue-500/20"
        >
          <svg
            width="12"
            height="12"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mr-1"
          >
            <path
              style="fill: currentColor"
              d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"
            />
          </svg>
          Unstakeable
        </span>
        <span
          v-if="!token.capped"
          class="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-500 border border-orange-500/20"
        >
          <svg
            class="mr-1"
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path
              style="fill: currentColor"
              :d="mdiInfinity"
            />
          </svg>
          Uncapped
        </span>
      </div>

      <!-- Owner -->
      <div class="pt-2 border-t">
        <div class="text-xs text-muted-foreground">
          Owner:
          <span class="font-mono text-foreground">
            {{ token.ownerPublicKey.slice(0, 8) }}...{{ token.ownerPublicKey.slice(-6) }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
