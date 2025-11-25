<script setup lang="ts">
import { mdiContentCopy, mdiCheck } from '@mdi/js';
import { toast } from 'vue-sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import type { CTokenBalanceDisplay, CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { copyText } from '@/utils/copy';
import { toastError } from '@/utils/parse-error';

const props = defineProps<{
  token: CTokenDefinitionDisplay;
  userBalance: CTokenBalanceDisplay | null;
  isLoggedIn: boolean;
}>();

const isCopied = ref(false);
const isAssetNumCopied = ref(false);

// Copy owner address to clipboard
const copyOwnerAddress = () => {
  if (!props.token?.ownerPublicKey) return;

  try {
    copyText(props.token.ownerPublicKey);
    toast.success('Owner address copied to clipboard');
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 1000);
  } catch (error) {
    toastError('Failed to copy address', error);
  }
};

// Copy Asset Num to clipboard
const copyAssetNum = () => {
  if (!props.token?.assetNum) return;

  try {
    copyText(props.token.assetNum.toString());
    toast.success('Asset Num copied to clipboard');
    isAssetNumCopied.value = true;
    setTimeout(() => {
      isAssetNumCopied.value = false;
    }, 1000);
  } catch (error) {
    toastError('Failed to copy Asset Num', error);
  }
};
</script>

<template>
  <Card class="overflow-hidden">
    <CardContent class="p-6">
      <!-- Main Token Info -->
      <div class="flex flex-col sm:flex-row items-start gap-6 mb-6">
        <Avatar class="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0">
          <AvatarImage
            v-if="props.token.image"
            :src="props.token.image"
            :alt="props.token.name"
          />
          <AvatarFallback>
            <svg
              v-if="!props.token.image"
              width="48"
              height="48"
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
              class="text-xl sm:text-2xl font-bold text-primary"
            >
              {{ props.token.symbol ? props.token.symbol.slice(0, 2).toUpperCase() : props.token.name ? props.token.name.slice(0, 2).toUpperCase() : '' }}
            </span>
          </AvatarFallback>
        </Avatar>

        <div class="flex-1 min-w-0">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
              {{ props.token.name }}
            </h1>
            <span
              v-if="props.token.isNft"
              class="inline-flex items-center rounded-md bg-purple-500/10 text-[16px]/[18px] px-2 font-medium text-purple-500 border border-purple-500/20"
            >
              NFT
            </span>
            <span
              v-if="props.token.isStaked"
              class="inline-flex items-center rounded-md bg-blue-500/10  text-[16px]/[18px] px-2 font-medium text-blue-500 border border-blue-500/20"
            >
              staked
            </span>
          </div>

          <p
            v-if="props.token.description"
            class="text-muted-foreground text-base mb-4 leading-relaxed whitespace-pre-line"
            style="word-break:break-word"
          >
            {{ props.token.description }}
          </p>

          <!-- Technical Details - Compact -->
          <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            <div class="flex items-center gap-1">
              <span class="font-medium">Asset num:</span>
              <button
                type="button"
                class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono hover:bg-muted/80 transition-colors inline-flex items-center gap-1.5"
                @click="copyAssetNum"
              >
                {{ props.token.assetNum }}
                <svg
                  width="14"
                  height="14"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="transition-all"
                >
                  <path
                    style="fill: currentColor"
                    :d="isAssetNumCopied ? mdiCheck : mdiContentCopy"
                  />
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-1">
              <span class="font-medium">Precision:</span>
              <span class="bg-muted px-1.5 py-0.5 rounded text-xs">{{ props.token.precision }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="font-medium">Owner:</span>
              <button
                type="button"
                class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono hover:bg-muted/80 transition-colors inline-flex items-center gap-1.5"
                @click="copyOwnerAddress"
              >
                {{ props.token.ownerPublicKey.slice(0, 6) }}...{{ props.token.ownerPublicKey.slice(-6) }}
                <svg
                  width="14"
                  height="14"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="transition-all"
                >
                  <path
                    style="fill: currentColor"
                    :d="isCopied ? mdiCheck : mdiContentCopy"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Token Properties - Compact -->
          <div class="flex flex-wrap items-center gap-2 mb-6">
            <span
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                props.token.isNft ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              ]"
            >
              {{ props.token.isNft ? 'NFT' : 'Fungible' }}
            </span>
            <span
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                props.token.othersCanStake ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
              ]"
            >
              {{ props.token.othersCanStake ? 'Staking ✓' : 'Staking ✗' }}
            </span>
            <span
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                props.token.othersCanUnstake ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
              ]"
            >
              {{ props.token.othersCanUnstake ? 'Unstaking ✓' : 'Unstaking ✗' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Grid - Dense Layout -->
      <div class="border-t pt-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="text-primary"
          >
            <path
              style="fill: currentColor"
              d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"
            />
          </svg>
          Token Statistics
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Total Supply -->
          <div class="bg-accent/30 rounded-lg p-4 border">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-blue-500" />
              <span class="text-xs font-medium text-muted-foreground">Total Supply</span>
            </div>
            <div class="text-sm font-bold text-foreground truncate">
              {{ props.token.displayTotalSupply }}
            </div>
          </div>

          <!-- Max Supply -->
          <div class="bg-accent/30 rounded-lg p-4 border">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-orange-500" />
              <span class="text-xs font-medium text-muted-foreground">Max Supply</span>
            </div>
            <div class="text-sm font-bold text-foreground truncate">
              {{ props.token.displayMaxSupply }}
            </div>
          </div>

          <!-- Your Balance -->
          <div class="bg-accent/30 rounded-lg p-4 border">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-green-500" />
              <span class="text-xs font-medium text-muted-foreground">Your Balance</span>
            </div>
            <div class="text-sm font-bold text-foreground truncate">
              {{ props.isLoggedIn ? props.userBalance?.displayBalance : '—' }}
            </div>
          </div>

          <!-- Market Cap Placeholder -->
          <div class="bg-accent/30 rounded-lg p-4 border">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-purple-500" />
              <span class="text-xs font-medium text-muted-foreground">Market Cap</span>
            </div>
            <div class="text-sm font-bold text-foreground">
              —
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
