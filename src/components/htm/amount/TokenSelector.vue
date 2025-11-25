<script setup lang="ts">
import { mdiArrowDown } from '@mdi/js';
import { Check, Search } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger } from '@/components/ui/combobox';
import { useTokensStore, type CTokenBalanceDisplay, type CTokenDisplayBase } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

interface TokenOption {
  balance: CTokenBalanceDisplay;
  displayName: string;
  displayBalance: string;
}

interface Props {
  modelValue?: CTokenDisplayBase | undefined; // Selected token asset number
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  placeholder: 'Select a token...'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: CTokenBalanceDisplay | undefined): void;
}>();

const tokensStore = useTokensStore();

// Reactive state
const searchQuery = ref('');
const selectedValue = ref<string | null>(props.modelValue?.assetNum ? String(props.modelValue.assetNum) : null);

// Watch selectedValue and emit changes
watch(selectedValue, (newValue) => {
  const selectedToken = tokensStore.fungibleBalances.find(token => String(token.liquid.assetNum) === newValue);

  emit('update:modelValue', selectedToken?.liquid);
});

// Watch props.modelValue and update selectedValue
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue?.assetNum ? String(newValue.assetNum) : null;
});

// Get user's token balances with positive amounts
const ownedTokens = computed((): TokenOption[] => {
  return tokensStore.fungibleBalances
    .filter(balance => balance.liquid.balance > 0n)
    .map(balance => ({
      balance: balance.liquid,
      displayName: balance.liquid.symbol!,
      displayBalance: balance.liquid.displayBalance
    } satisfies TokenOption))
    .sort((a, b) => b.balance.balance - a.balance.balance > 0n ? 1 : -1);
});

// Filtered tokens based on search query
const filteredTokens = computed((): TokenOption[] => {
  if (!searchQuery.value.trim())
    return ownedTokens.value;

  const query = searchQuery.value.toLowerCase();
  return ownedTokens.value.filter(token => {
    return token.displayName?.toLowerCase().includes(query) ||
        token.balance?.symbol?.toLowerCase().includes(query) ||
        String(token.balance.assetNum).includes(query);
  }
  );
});

// Selected token
const selectedToken = computed(() => {
  return ownedTokens.value.find(token => String(token.balance.assetNum) === selectedValue.value);
});

const fetchBalances = async () => {
  try { // TODO: Add pagination / search support later
    await tokensStore.loadBalances();
  } catch (error) {
    toastError('Failed to load token balances:', error);
  }
};

// Load balances on mount if not already loaded
onMounted(() => {
  if (tokensStore.fungibleBalances.length === 0)
    void fetchBalances();
});
</script>

<template>
  <Combobox v-model="selectedValue" :disabled="disabled">
    <ComboboxAnchor class="relative w-full">
      <ComboboxTrigger class="flex h-9 w-full items-center justify-between rounded-r-md bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        <div class="flex items-center justify-between flex-1 min-w-0">
          <div
            v-if="selectedToken"
            class="flex items-center gap-2 truncate flex-1 min-w-0"
          >
            <Avatar v-if="selectedToken.balance.image" class="h-6 w-6 mr-1">
              <AvatarImage
                :src="selectedToken.balance.image"
                :alt="selectedToken.displayName"
              />
            </Avatar>
            <span class="text-sm font-medium">{{ selectedToken.displayName }}</span>
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
            class="flex-shrink-0 text-muted-foreground ml-2"
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
            :key="String(token.balance.assetNum)"
            :value="String(token.balance.assetNum)"
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
