<script setup lang="ts">
import { mdiCurrencyUsd, mdiRefresh, mdiContentCopy, mdiPlus, mdiClose, mdiCodeJson, mdiChevronDown } from '@mdi/js';
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
import { BUILTIN_METADATA_KEYS } from '@/utils/htm-metadata';
import { toastError } from '@/utils/parse-error';
import type { validateTokenSymbol } from '@/utils/validators';

interface Props {
  token: CTokenDisplayBase & {
    othersCanStake: boolean;
    othersCanUnstake: boolean;
  };
  initialSupply?: string;
  generatedAssetNum?: string | number | bigint;
  isSubmitting: boolean;
  symbolValidation: ReturnType<typeof validateTokenSymbol>;
  mode?: 'create' | 'edit';
}

interface Emits {
  (e: 'update:token', value: Props['token']): void;
  (e: 'update:initialSupply', value: string | number): void;
  (e: 'regenerateAssetNum'): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  initialSupply: '',
  generatedAssetNum: ''
});
const emit = defineEmits<Emits>();

const isCreateMode = computed(() => props.mode === 'create');

const assetNumGenerated = computed(() => !!props.generatedAssetNum);

const assetNumDisplayValue = computed(() => {
  if (props.generatedAssetNum)
    return String(props.generatedAssetNum);
  if ((props.token.symbol || '').trim().length >= 3)
    return 'Generating...';
  return '';
});

const shouldShowAssetNumField = computed(() => {
  return props.symbolValidation.isValid;
});

const regenerateAssetNum = () => {
  emit('regenerateAssetNum');
};

// Copy Asset Num to clipboard
const copyAssetNum = async () => {
  try {
    void copyText(String(props.generatedAssetNum));
    toast.success('Asset Num copied to clipboard!');
  } catch {
    toastError('Failed to copy Asset Num');
  }
};

// Custom metadata entries derived from token.metadata
const customMetadataEntries = computed(() => {
  const metadata = props.token.metadata || {};
  return Object.entries(metadata)
    .filter(([key]) => !BUILTIN_METADATA_KEYS.has(key))
    .map(([key, value]) => ({ key, value: String(value ?? '') }));
});

// JSON view toggle
const isJsonMode = ref(false);
const jsonInput = ref('');
const jsonError = ref('');

// Sync JSON textarea when switching to JSON mode
watch(isJsonMode, (enabled) => {
  if (enabled) {
    const customObj: Record<string, string> = {};
    for (const entry of customMetadataEntries.value)
      customObj[entry.key] = entry.value;
    jsonInput.value = Object.keys(customObj).length > 0 ? JSON.stringify(customObj, null, 2) : '';
    jsonError.value = '';
  }
});

const applyJson = () => {
  const trimmed = jsonInput.value.trim();
  if (!trimmed) {
    // Clear all custom metadata
    const builtinOnly = Object.fromEntries(
      Object.entries(props.token.metadata).filter(([k]) => BUILTIN_METADATA_KEYS.has(k))
    );
    emit('update:token', { ...props.token, metadata: builtinOnly });
    jsonError.value = '';
    return;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      jsonError.value = 'JSON must be a flat object, e.g. {"key": "value"}';
      return;
    }

    // Keep builtin keys, replace custom with parsed
    const builtinOnly = Object.fromEntries(
      Object.entries(props.token.metadata).filter(([k]) => BUILTIN_METADATA_KEYS.has(k))
    );
    const newMetadata: Record<string, unknown> = { ...builtinOnly };
    for (const [key, value] of Object.entries(parsed)) {
      const trimmedKey = String(key).trim();
      if (trimmedKey && !BUILTIN_METADATA_KEYS.has(trimmedKey))
        newMetadata[trimmedKey] = String(value ?? '');
    }
    emit('update:token', { ...props.token, metadata: newMetadata });
    jsonError.value = '';
    isJsonMode.value = false;
  } catch {
    jsonError.value = 'Invalid JSON';
  }
};

const copyCustomMetadataJson = () => {
  const customObj: Record<string, string> = {};
  for (const entry of customMetadataEntries.value)
    customObj[entry.key] = entry.value;
  try {
    void copyText(JSON.stringify(customObj, null, 2));
    toast.success('Custom metadata JSON copied!');
  } catch {
    toastError('Failed to copy JSON');
  }
};

const isMetadataExpanded = ref(false);

// Auto-expand if there are already custom metadata entries
watch(() => customMetadataEntries.value.length, (len) => {
  if (len > 0)
    isMetadataExpanded.value = true;
}, { immediate: true });

const addCustomMetadataEntry = () => {
  const currentMetadata = { ...props.token.metadata };
  // Find a unique temporary placeholder key
  let index = 1;
  while (currentMetadata[`__new_${index}`] !== undefined)
    index++;
  currentMetadata[`__new_${index}`] = '';
  isMetadataExpanded.value = true;
  emit('update:token', { ...props.token, metadata: currentMetadata });
};

const removeCustomMetadataEntry = (key: string) => {
  const currentMetadata = Object.fromEntries(
    Object.entries(props.token.metadata).filter(([k]) => k !== key)
  );
  emit('update:token', { ...props.token, metadata: currentMetadata });
};

const updateCustomMetadataKey = (oldKey: string, newKey: string) => {
  const currentMetadata = Object.fromEntries(
    Object.entries(props.token.metadata).map(([k, v]) => k === oldKey ? [newKey, v] : [k, v])
  );
  emit('update:token', { ...props.token, metadata: currentMetadata });
};

const updateCustomMetadataValue = (key: string, value: string) => {
  const currentMetadata = { ...props.token.metadata };
  currentMetadata[key] = value;
  emit('update:token', { ...props.token, metadata: currentMetadata });
};

const isReservedKey = (key: string) => BUILTIN_METADATA_KEYS.has(key.trim().toLowerCase());
</script>

<template>
  <Card data-testid="tokencreate-card">
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
        Enter the details for your new token. Note: The token name is only a display property that can be changed. The Asset Num is the only unique identifier for your token.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Token Name -->
      <div class="space-y-2">
        <Label for="token-name">Token Name *</Label>
        <Input
          id="token-name"
          data-testid="tokencreate-name"
          :model-value="token.name"
          placeholder="e.g., My Awesome Token"
          :disabled="isSubmitting"
          @update:model-value="emit('update:token', { ...token, name: $event as string })"
        />
      </div>

      <!-- Token Symbol -->
      <div class="space-y-2">
        <Label for="token-symbol">Token Symbol *</Label>
        <Input
          id="token-symbol"
          data-testid="tokencreate-symbol"
          :model-value="token.symbol"
          placeholder="e.g., MAT"
          class="uppercase"
          :class="{ 'border-red-500': (token.symbol || '').length > 0 && !symbolValidation.isValid }"
          maxlength="10"
          :disabled="isSubmitting"
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
          data-testid="tokencreate-description"
          :model-value="token.description"
          placeholder="Describe your token..."
          :disabled="isSubmitting"
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
          :disabled="isSubmitting"
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
          :disabled="isSubmitting"
          class="font-mono text-sm"
          @update:model-value="emit('update:token', { ...token, website: $event as string })"
        />
        <p class="text-xs text-muted-foreground">
          Optional: Official website for your token project
        </p>
      </div>

      <Separator />

      <!-- Custom Metadata -->
      <div class="space-y-3">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md py-1 text-left transition-colors hover:text-foreground/80"
          :disabled="isSubmitting"
          @click="isMetadataExpanded = !isMetadataExpanded"
        >
          <div>
            <Label
              as="span"
              class="pointer-events-none"
            >Custom Metadata</Label>
            <p class="text-xs text-muted-foreground">
              Add extra properties like social links or tags
            </p>
          </div>
          <svg
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="text-muted-foreground transition-transform duration-200 flex-shrink-0"
            :class="{ 'rotate-180': isMetadataExpanded }"
          >
            <path
              style="fill: currentColor"
              :d="mdiChevronDown"
            />
          </svg>
        </button>

        <div
          v-if="isMetadataExpanded"
          class="space-y-3"
        >
          <!-- Mode toggle -->
          <div class="flex items-center gap-2">
            <div class="flex rounded-md border">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors rounded-l-md"
                :class="!isJsonMode ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'"
                :disabled="isSubmitting"
                @click="isJsonMode = false"
              >
                Fields
              </button>
              <button
                type="button"
                class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md border-l"
                :class="isJsonMode ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'"
                :disabled="isSubmitting"
                @click="isJsonMode = true"
              >
                <svg
                  width="14"
                  height="14"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiCodeJson"
                  />
                </svg>
                JSON
              </button>
            </div>
            <Button
              v-if="customMetadataEntries.length > 0"
              variant="ghost"
              size="sm"
              class="ml-auto h-8"
              :disabled="isSubmitting"
              @click="copyCustomMetadataJson"
            >
              <svg
                width="14"
                height="14"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="mr-1"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiContentCopy"
                />
              </svg>
              Copy
            </Button>
          </div>

          <!-- JSON Mode -->
          <div
            v-if="isJsonMode"
            class="space-y-2"
          >
            <Textarea
              v-model="jsonInput"
              placeholder='{"twitter": "@handle", "discord": "server_id"}'
              :disabled="isSubmitting"
              rows="5"
              class="font-mono text-sm"
              data-testid="custom-metadata-json"
            />
            <p
              v-if="jsonError"
              class="text-xs text-red-500"
            >
              {{ jsonError }}
            </p>
            <Button
              size="sm"
              :disabled="isSubmitting"
              @click="applyJson"
            >
              Apply JSON
            </Button>
          </div>

          <!-- Fields Mode -->
          <template v-else>
            <!-- Column headers -->
            <div
              v-if="customMetadataEntries.length > 0"
              class="flex items-center gap-2 px-1"
            >
              <span class="flex-1 text-xs font-medium text-muted-foreground">Key</span>
              <span class="flex-1 text-xs font-medium text-muted-foreground">Value</span>
              <span class="w-9 flex-shrink-0" />
            </div>

            <div
              v-for="(entry, index) in customMetadataEntries"
              :key="index"
              class="flex items-start gap-2"
            >
              <div class="flex-1 space-y-1">
                <Input
                  :model-value="entry.key.startsWith('__new_') ? '' : entry.key"
                  placeholder="e.g. twitter"
                  :disabled="isSubmitting"
                  class="font-mono text-sm"
                  :class="{ 'border-red-500': isReservedKey(entry.key) }"
                  data-testid="custom-metadata-key"
                  @update:model-value="updateCustomMetadataKey(entry.key, $event as string)"
                />
                <p
                  v-if="isReservedKey(entry.key)"
                  class="text-xs text-red-500"
                >
                  Reserved key. Use the dedicated field above.
                </p>
              </div>
              <div class="flex-1">
                <Input
                  :model-value="entry.value"
                  placeholder="e.g. @handle"
                  :disabled="isSubmitting"
                  class="text-sm"
                  data-testid="custom-metadata-value"
                  @update:model-value="updateCustomMetadataValue(entry.key, $event as string)"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
                :disabled="isSubmitting"
                @click="removeCustomMetadataEntry(entry.key)"
              >
                <svg
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    style="fill: currentColor"
                    :d="mdiClose"
                  />
                </svg>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              class="w-full border-dashed"
              :disabled="isSubmitting"
              @click="addCustomMetadataEntry"
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
                  :d="mdiPlus"
                />
              </svg>
              Add field
            </Button>
          </template>
        </div>
      </div>

      <Separator />

      <!-- Initial Supply -->
      <div
        v-if="isCreateMode"
        class="space-y-2"
      >
        <Label for="initial-supply">Initial Supply *</Label>
        <Input
          id="initial-supply"
          data-testid="tokencreate-supply"
          :model-value="initialSupply"
          placeholder="1000000"
          :disabled="isSubmitting"
          @update:model-value="emit('update:initialSupply', $event)"
        />
        <p class="text-xs text-muted-foreground">
          Total number of tokens to create
        </p>
      </div>

      <!-- Precision -->
      <div
        v-if="isCreateMode"
        class="space-y-2"
      >
        <Label for="precision">Decimal Precision *</Label>
        <Input
          id="precision"
          data-testid="tokencreate-precision"
          :model-value="token.precision"
          type="number"
          min="0"
          max="12"
          step="1"
          placeholder="3"
          :disabled="isSubmitting"
          class="w-full"
          @update:model-value="emit('update:token', { ...token, precision: Number($event) })"
        />
        <p class="text-xs text-muted-foreground">
          Number of decimal places for token amounts (0-12)
        </p>
      </div>

      <!-- Staking Options -->
      <div
        v-if="isCreateMode"
        class="space-y-3"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="others-can-stake"
              :model-value="token.othersCanStake"
              :disabled="isSubmitting"
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
              :disabled="isSubmitting"
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

      <Separator v-if="isCreateMode" />

      <!-- Generated Asset Num -->
      <div
        v-if="isCreateMode"
        class="space-y-2"
      >
        <div class="flex items-center justify-between">
          <Label>Generated Asset Num</Label>
          <Button
            v-if="assetNumGenerated"
            variant="outline"
            size="sm"
            :disabled="isSubmitting"
            @click="regenerateAssetNum"
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
          v-if="shouldShowAssetNumField"
          class="flex items-center gap-2"
        >
          <Input
            :value="assetNumDisplayValue"
            readonly
            class="font-mono"
            :class="{ 'text-muted-foreground': !generatedAssetNum }"
          />
          <Button
            v-if="assetNumGenerated"
            variant="outline"
            size="sm"
            @click="copyAssetNum"
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
