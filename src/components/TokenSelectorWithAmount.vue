<script setup lang="ts">
import { computed } from 'vue';

import TokenSelector from '@/components/tokens/TokenSelector.vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  modelValue: string;
  selectedTokenAssetNum: string;
  tokenSymbol?: string;
  tokenName: string;
  tokenPrecision?: string;
  tokenImage?: string;
  isValid: boolean;
  validationError?: string;
}

const props = defineProps<Props>();

const emit = defineEmits(['update:modelValue', 'update:selectedTokenAssetNum']);

const amount = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
});

const selectedToken = computed({
  get: () => props.selectedTokenAssetNum,
  set: (value: string | null) => emit('update:selectedTokenAssetNum', value || '')
});

const placeholder = computed(() => {
  return selectedToken.value ? `${props.tokenPrecision} precision amount` : 'No token selected';
});
</script>

<template>
  <div class="mt-1">
    <Label
      for="amount"
      class="text-sm font-medium text-foreground"
    >
      Amount
    </Label>
    <div class="flex items-center w-full">
      <div class="w-[75%]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Input
                id="amount"
                v-model="amount"
                :disabled="!selectedTokenAssetNum"
                type="text"
                inputmode="decimal"
                :placeholder="placeholder"
                class="pr-12 rounded-r-none border-r-0"
              />
            </TooltipTrigger>
            <TooltipContent v-if="!selectedTokenAssetNum">
              <p>Select token to send first.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p
          v-if="modelValue && !isValid && validationError"
          class="text-xs text-red-500 mt-1"
        >
          {{ validationError }}
        </p>
      </div>
      <TokenSelector
        id="token-selector"
        v-model="selectedToken"
        placeholder="Choose token"
        class="w-[25%]"
        :class="{ 'mb-5': modelValue && !isValid && validationError }"
      />
    </div>
  </div>
</template>
