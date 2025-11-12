<script setup lang="ts">
import { mdiArrowDown } from '@mdi/js';
import { Check, Search } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger } from '@/components/ui/combobox';
import { useTokensStore } from '@/stores/tokens.store';
import type { CtokensAppBalance } from '@/utils/wallet/ctokens/api';

import { isVesting } from '~/src/utils/nai-tokens';

interface TokenOption {
  balance: CtokensAppBalance;
  displayName: string;
  displayBalance: string;
}

interface Props {
  modelValue?: string; // Selected token asset number
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Select a token...'
});

const emit = defineEmits(['update:modelValue']);

const tokensStore = useTokensStore();

// Reactive state
const searchQuery = ref('');
const selectedValue = ref<string | null>(props.modelValue || null);

// Watch selectedValue and emit changes
watch(selectedValue, (newValue) => {
  emit('update:modelValue', newValue);
});

// Watch props.modelValue and update selectedValue
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue || null;
});

// Get user's token balances with positive amounts
const ownedTokens = computed((): TokenOption[] => {
  return tokensStore.balances
    .filter(balance => isVesting(balance.nai!, balance.precision!) === false) // Exclude vesting tokens
    .filter(balance => {
      // Filter out zero balances
      const amount = BigInt(balance.amount || '0');
      return amount > 0;
    })
    .map(balance => {
      // Get token metadata for display name
      const tokenDef = tokensStore.getTokenDefinitionByNAI(balance.nai!);
      const metadata = balance.metadata as Record<string, string> | undefined;
      const tokenMetadata = tokenDef?.metadata as Record<string, string> | undefined;

      // Use symbol from balance metadata, then token definition, then fallback to NAI
      const symbol = metadata?.symbol || tokenMetadata?.symbol || balance.nai || 'Unknown';

      // Format balance amount with proper precision
      let formattedBalance = '0';
      try {
        const numAmount = parseFloat(balance.amount || '0');
        const precision = balance.precision || 0;
        formattedBalance = numAmount.toFixed(Math.min(precision, 6)); // Limit to 6 decimal places for display
      } catch (error) {
        console.warn('Failed to format balance:', error);
        formattedBalance = balance.amount || '0';
      }

      return {
        balance,
        displayName: symbol,
        displayBalance: formattedBalance
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
});

// Filtered tokens based on search query
const filteredTokens = computed((): TokenOption[] => {
  if (!searchQuery.value.trim())
    return ownedTokens.value;

  const query = searchQuery.value.toLowerCase();
  return ownedTokens.value.filter(token => {
    return token.displayName.toLowerCase().includes(query) ||
        token.balance.metadata?.symbol?.toLowerCase().includes(query) ||
        String(token.balance.asset_num).includes(query);
  }
  );
});

// Selected token
const selectedToken = computed(() => {
  return ownedTokens.value.find(token => String(token.balance.asset_num) === selectedValue.value);
});

// Token image URL
const tokenImage = computed(() => {
  if (!selectedToken.value) return undefined;
  const metadata = selectedToken.value.balance.metadata as { image?: string } | undefined;
  const tokenDef = tokensStore.getTokenDefinitionByNAI(selectedToken.value.balance.nai!);
  const tokenMetadata = tokenDef?.metadata as { image?: string } | undefined;
  return metadata?.image || tokenMetadata?.image || '';
});

// Watch for changes in balances to ensure we have the latest data
watch(() => tokensStore.balances, () => {
  // Balances updated, component will re-compute ownedTokens
}, { deep: true, immediate: true });

// Load balances on mount if not already loaded
onMounted(async () => {
  if (tokensStore.balances.length === 0)
    await tokensStore.loadBalances();
});
</script>

<template>
  <Combobox v-model="selectedValue">
    <ComboboxAnchor class="relative w-full">
      <ComboboxTrigger class="flex h-9 w-full items-center justify-between rounded-r-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        <div class="flex items-center justify-between flex-1 min-w-0">
          <div
            v-if="selectedToken"
            class="flex items-center gap-2 truncate flex-1 min-w-0"
          >
            <Avatar v-if="tokenImage" class="h-6 w-6">
              <AvatarImage
                :src="tokenImage"
                :alt="selectedToken.displayName"
              />
            </Avatar>
            <span class="font-semibold text-foreground truncate">{{ selectedToken.displayName }}</span>
          </div>
          <span
            v-else
            class="text-muted-foreground font-medium truncate"
          >
            {{ placeholder }}
          </span>
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="flex-shrink-0 text-muted-foreground"
            >
            <path
              style="fill: currentColor"
              :d="mdiArrowDown"
            />
          </svg>
        </div>
      </ComboboxTrigger>
      <ComboboxList class="mt-1 bg-popover border border-border rounded-lg shadow-lg p-0 max-h-64 overflow-hidden">
        <div class="flex items-center border-b border-border px-4 py-2 bg-muted/50">
          <Search class="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <ComboboxInput
            v-model="searchQuery"
            class="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search tokens..."
          />
        </div>
        <ComboboxEmpty class="py-8 text-center text-sm text-muted-foreground">
          <div class="flex flex-col items-center gap-2">
            <Search class="h-8 w-8 opacity-40" />
            <span>No tokens found.</span>
          </div>
        </ComboboxEmpty>
        <ComboboxGroup class="max-h-48 overflow-y-auto">
          <ComboboxItem
            v-for="token in filteredTokens"
            :key="String(token.balance.asset_num)"
            :value="String(token.balance.asset_num)"
            class="cursor-pointer px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors focus:bg-accent focus:text-accent-foreground"
          >
            <div class="flex w-full items-center justify-between gap-3">
              <div class="flex flex-col items-start min-w-0 flex-1">
                <span class="font-semibold text-foreground truncate">{{ token.displayName }}</span>
                <span class="text-xs text-muted-foreground">
                  Balance: {{ token.displayBalance }}
                </span>
              </div>
              <ComboboxItemIndicator>
                <div class="flex items-center justify-center w-5 h-5 rounded-full bg-primary">
                  <Check class="h-3 w-3 text-primary-foreground" />
                </div>
              </ComboboxItemIndicator>
            </div>
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxList>
    </ComboboxAnchor>
  </Combobox>
</template>
