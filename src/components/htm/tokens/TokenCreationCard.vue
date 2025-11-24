<script setup lang="ts">
import { mdiCurrencyUsd, mdiRefresh, mdiContentCopy } from '@mdi/js';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { CTokenDisplayBase } from '@/stores/tokens.store';
import { copyText } from '@/utils/copy';
import type { validateTokenSymbol } from '@/utils/validators';

interface Props {
  token: CTokenDisplayBase & {
    othersCanStake: boolean;
    othersCanUnstake: boolean;
  };
  initialSupply: string;
  generatedNai: string;
  isCreatingToken: boolean;
  symbolValidation: ReturnType<typeof validateTokenSymbol>;
  hideSupplyFields?: boolean;
  hideStakingOptions?: boolean;
  hideNaiGeneration?: boolean;
}

interface Emits {
  (e: 'update:token', value: Props['token']): void;
  (e: 'update:initialSupply', value: string | number): void;
  (e: 'regenerateNAI'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const naiGenerated = computed(() => !!props.generatedNai);

const naiDisplayValue = computed(() => {
  if (props.generatedNai)
    return props.generatedNai;
  if ((props.token.symbol || '').trim().length >= 3)
    return 'Generating...';
  return '';
});

const shouldShowNAIField = computed(() => {
  return props.symbolValidation.isValid;
});

const regenerateNAI = () => {
  emit('regenerateNAI');
};

// Copy NAI to clipboard
const copyNAI = async () => {
  try {
    copyText(props.generatedNai);
    toast.success('NAI copied to clipboard!');
  } catch (_error) {
    toast.error('Failed to copy NAI');
  }
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: currentColor"
            :d="mdiCurrencyUsd"
          />
        </svg>
        Token Details
      </CardTitle>
      <CardDescription>
        Enter the details for your new NAI token. Note: The token name is only a display property that can be changed. The NAI (Network Asset Identifier) is the only unique identifier for your token.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Token Name -->
      <div class="space-y-2">
        <Label for="token-name">Token Name *</Label>
        <Input
          id="token-name"
          :model-value="token.name"
          placeholder="e.g., My Awesome Token"
          :disabled="isCreatingToken"
          @update:model-value="emit('update:token', { ...token, name: $event as string })"
        />
      </div>

      <!-- Token Symbol -->
      <div class="space-y-2">
        <Label for="token-symbol">Token Symbol *</Label>
        <Input
          id="token-symbol"
          :model-value="token.symbol"
          placeholder="e.g., MAT"
          class="uppercase"
          :class="{ 'border-red-500': (token.symbol || '').length > 0 && !symbolValidation.isValid }"
          maxlength="10"
          :disabled="isCreatingToken"
          @update:model-value="emit('update:token', { ...token, symbol: $event as string })"
        />
        <p
          class="text-xs"
          :class="(token.symbol || '').length > 0 && !symbolValidation.isValid ? 'text-red-500' : 'text-muted-foreground'"
        >
          {{ (token.symbol || '').length > 0 && !symbolValidation.isValid ? symbolValidation.message : '3-10 characters, letters only' }}
        </p>
      </div>

      <!-- Token Description -->
      <div class="space-y-2">
        <Label for="token-description">Description</Label>
        <Textarea
          id="token-description"
          :model-value="token.description"
          placeholder="Describe your token..."
          :disabled="isCreatingToken"
          rows="3"
          @update:model-value="emit('update:token', { ...token, description: $event as string })"
        />
      </div>

      <Separator />

      <!-- Token Image URL -->
      <div class="space-y-2">
        <Label for="token-image">Image URL</Label>
        <Input
          id="token-image"
          :model-value="token.image"
          type="url"
          placeholder="https://example.com/token-logo.png"
          :disabled="isCreatingToken"
          class="font-mono text-sm"
          @update:model-value="emit('update:token', { ...token, image: $event as string })"
        />
        <p class="text-xs text-muted-foreground">
          Optional: URL to your token's logo or icon
        </p>
      </div>

      <!-- Token Website URL -->
      <div class="space-y-2">
        <Label for="token-website">Website URL</Label>
        <Input
          id="token-website"
          :model-value="token.website"
          type="url"
          placeholder="https://example.com"
          :disabled="isCreatingToken"
          class="font-mono text-sm"
          @update:model-value="emit('update:token', { ...token, website: $event as string })"
        />
        <p class="text-xs text-muted-foreground">
          Optional: Official website for your token project
        </p>
      </div>

      <Separator />

      <!-- Initial Supply -->
      <div
        v-if="!hideSupplyFields"
        class="space-y-2"
      >
        <Label for="initial-supply">Initial Supply *</Label>
        <Input
          id="initial-supply"
          :model-value="initialSupply"
          placeholder="1000000"
          :disabled="isCreatingToken"
          @update:model-value="emit('update:initialSupply', $event)"
        />
        <p class="text-xs text-muted-foreground">
          Total number of tokens to create
        </p>
      </div>

      <!-- Precision -->
      <div
        v-if="!hideSupplyFields"
        class="space-y-2"
      >
        <Label for="precision">Decimal Precision *</Label>
        <Input
          id="precision"
          :model-value="token.precision"
          type="number"
          min="0"
          max="12"
          step="1"
          placeholder="3"
          :disabled="isCreatingToken"
          class="w-full"
          @update:model-value="emit('update:token', { ...token, precision: Number($event) })"
        />
        <p class="text-xs text-muted-foreground">
          Number of decimal places for token amounts (0-12)
        </p>
      </div>

      <!-- Staking Options -->
      <div
        v-if="!hideStakingOptions"
        class="space-y-3"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="others-can-stake"
              :model-value="token.othersCanStake"
              :disabled="isCreatingToken"
              @update:model-value="(val) => emit('update:token', { ...token, othersCanStake: val as boolean })"
            />
            <Label
              for="others-can-stake"
              class="text-sm font-normal"
            >
              Others can stake
            </Label>
          </div>

          <div class="flex items-center space-x-2">
            <Checkbox
              id="others-can-unstake"
              :model-value="token.othersCanUnstake"
              :disabled="isCreatingToken"
              @update:model-value="(val) => emit('update:token', { ...token, othersCanUnstake: val as boolean })"
            />
            <Label
              for="others-can-unstake"
              class="text-sm font-normal"
            >
              Others can unstake
            </Label>
          </div>
        </div>
      </div>

      <Separator v-if="!hideNaiGeneration" />

      <!-- Generated NAI -->
      <div
        v-if="!hideNaiGeneration"
        class="space-y-2"
      >
        <div class="flex items-center justify-between">
          <Label>Generated NAI</Label>
          <Button
            v-if="naiGenerated"
            variant="outline"
            size="sm"
            :disabled="isCreatingToken"
            @click="regenerateNAI"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-1"
            >
              <path
                style="fill: currentColor"
                :d="mdiRefresh"
              />
            </svg>
            Regenerate
          </Button>
        </div>

        <div
          v-if="shouldShowNAIField"
          class="flex items-center gap-2"
        >
          <Input
            :value="naiDisplayValue"
            readonly
            class="font-mono"
            :class="{ 'text-muted-foreground': !generatedNai }"
          />
          <Button
            v-if="naiGenerated"
            variant="outline"
            size="sm"
            @click="copyNAI"
          >
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                style="fill: currentColor"
                :d="mdiContentCopy"
              />
            </svg>
          </Button>
        </div>

        <div
          v-else
          class="text-sm text-muted-foreground"
        >
          Enter a token symbol (3+ characters) to generate unique ID
        </div>
      </div>
    </CardContent>
  </Card>
</template>
