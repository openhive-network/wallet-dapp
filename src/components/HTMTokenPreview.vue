<script setup lang="ts">
import { computed } from 'vue';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CTokenDisplay } from '@/stores/tokens.store';

interface TokenPreviewData {
  name?: string;
  symbol?: string;
  description?: string;
  nai?: string;
  image?: string;
  totalSupply?: string | bigint;
  maxSupply?: string | bigint;
  displayTotalSupply?: string;
  displayMaxSupply?: string;
  precision?: number | string;
  capped?: boolean;
  isNft?: boolean;
  isStaked?: boolean;
  othersCanStake?: boolean;
  othersCanUnstake?: boolean;
  ownerPublicKey?: string;
}

interface Props {
  token: TokenPreviewData | CTokenDisplay;
  clickable?: boolean;
  showViewIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  showViewIcon: false
});

const emit = defineEmits<{
  click: [token: TokenPreviewData | CTokenDisplay];
}>();

// Get avatar fallback text
const getAvatarFallback = (token: TokenPreviewData | CTokenDisplay): string => {
  if (token.name)
    return token.name.slice(0, 2).toUpperCase();

  if (token.symbol)
    return token.symbol.slice(0, 2).toUpperCase();

  if (token.ownerPublicKey)
    return token.ownerPublicKey.slice(3, 5).toUpperCase();

  return 'TK';
};

// Handle card click
const handleClick = () => {
  if (props.clickable)
    emit('click', props.token);
};

// Check if token is a full CTokenDisplay
const isFullToken = (token: TokenPreviewData | CTokenDisplay): token is CTokenDisplay => {
  return 'displayTotalSupply' in token && 'displayMaxSupply' in token;
};

// Format number with precision
const formatTokenAmount = (amount: string | bigint | undefined, precision: number | string = 3): string => {
  if (!amount) return '0';

  const precisionNum = typeof precision === 'string' ? parseInt(precision) : precision;

  // If it's a bigint, convert to string first
  if (typeof amount === 'bigint') {
    const divisor = BigInt(10) ** BigInt(precisionNum);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === BigInt(0))
      return integerPart.toLocaleString();

    const fractionalStr = fractionalPart.toString().padStart(precisionNum, '0').replace(/0+$/, '');
    return `${integerPart.toLocaleString()}.${fractionalStr}`;
  }

  const num = parseFloat(amount);

  if (isNaN(num)) return amount;

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precisionNum
  });
};

const displayTotalSupply = computed(() => {
  if (isFullToken(props.token))
    return props.token.displayTotalSupply;

  const formatted = formatTokenAmount(props.token.totalSupply, props.token.precision);
  const symbol = props.token.symbol || props.token.name;
  return symbol ? `${formatted} ${symbol}` : formatted;
});

const displayMaxSupply = computed(() => {
  if (isFullToken(props.token))
    return props.token.displayMaxSupply;

  const formatted = formatTokenAmount(props.token.maxSupply, props.token.precision);
  const symbol = props.token.symbol || props.token.name;
  return symbol ? `${formatted} ${symbol}` : formatted;
});

const hasStakingFeatures = computed(() =>
  props.token.othersCanStake || props.token.othersCanUnstake
);
</script>

<template>
  <Card
    :class="[
      'transition-all',
      clickable ? 'hover:shadow-lg cursor-pointer group' : ''
    ]"
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
          <div class="flex flex-col gap-2 mb-1">
            <CardTitle class="text-lg truncate">
              {{ token.name || 'Unnamed Token' }}
            </CardTitle>
            <div class="flex flex-wrap gap-2">
              <span
                v-if="token.symbol"
                class="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary border border-primary/20"
              >
                {{ token.symbol }}
              </span>
              <span
                v-if="token.isNft"
                class="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500 border border-purple-500/20"
              >
                NFT
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                  token.capped ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                ]"
              >
                {{ token.capped ? 'Capped' : 'Uncapped' }}
              </span>
              <span
                v-if="token.isStaked"
                class="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 border border-green-500/20"
              >
                Staked
              </span>
            </div>
          </div>
          <CardDescription class="text-xs truncate">
            {{ token.nai || 'NAI will be generated' }}
          </CardDescription>
        </div>

        <!-- View Icon -->
        <svg
          v-if="showViewIcon"
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
          <span class="font-semibold text-foreground">
            {{ displayTotalSupply }}
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Max Supply:</span>
          <span class="font-semibold text-foreground flex items-center gap-1">
            <template v-if="token.capped">
              {{ displayMaxSupply }}
            </template>
            <template v-else>
              ∞ (Unlimited)
            </template>
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Precision:</span>
          <span class="font-semibold text-foreground">{{ token.precision ?? 3 }}</span>
        </div>
      </div>

      <!-- Token Feature Badges -->
      <div
        v-if="hasStakingFeatures"
        class="flex flex-wrap gap-2 pt-2"
      >
        <span
          v-if="token.othersCanStake"
          class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-200"
        >
          Staking ✓
        </span>
        <span
          v-if="token.othersCanUnstake"
          class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-200"
        >
          Unstaking ✓
        </span>
      </div>

      <!-- Owner -->
      <div
        v-if="token.ownerPublicKey"
        class="pt-2 border-t"
      >
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
