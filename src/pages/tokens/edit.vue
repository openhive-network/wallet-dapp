<script setup lang="ts">
import { mdiArrowLeft, mdiContentSave, mdiLoading } from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import HTMTokenPreview from '@/components/htm/HTMTokenPreview.vue';
import TokenCreationCard from '@/components/htm/tokens/TokenCreationCard.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings.store';
import type { CTokenDefinitionDisplay, CTokenDisplayBase } from '@/stores/tokens.store';
import { useTokensStore } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import { validateTokenSymbol } from '@/utils/validators';

definePageMeta({
  layout: 'htm'
});

// Router
const route = useRoute();
const router = useRouter();

// Stores
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();

// State
const token = ref<CTokenDefinitionDisplay | null>(null);
const isLoading = ref(true);
const isUpdating = ref(false);

// Form token object
const formToken = ref<CTokenDisplayBase & { othersCanStake: boolean; othersCanUnstake: boolean }>({
  isNft: false,
  nai: '',
  assetNum: 0,
  isStaked: false,
  precision: 0,
  metadata: {},
  name: '',
  symbol: '',
  description: '',
  image: '',
  website: '',
  othersCanStake: false,
  othersCanUnstake: false
});

// Get Asset Num and precision from route parameters
const assetNum = computed(() => Number(route.query['asset-num']));

// Check if user is logged in
const isLoggedIn = computed(() => !!settingsStore.settings.account);

// Check if current user is the token owner
const isTokenOwner = computed(() => {
  if (!token.value?.ownerPublicKey || !tokensStore.getUserPublicKey()) return false;
  return token.value.ownerPublicKey === tokensStore.getUserPublicKey();
});

// Symbol validation for TokenCreationCard
const symbolValidation = computed(() => validateTokenSymbol(formToken.value.symbol || ''));

// Form validation
const isFormValid = computed(() => {
  return (formToken.value.name || '').trim() !== '' &&
         symbolValidation.value.isValid;
});

// Preview token for HTMTokenPreview component
const previewToken = computed(() => {
  if (!token.value) return null;

  return {
    ...token.value,
    name: formToken.value.name,
    symbol: formToken.value.symbol,
    description: formToken.value.description,
    image: formToken.value.image,
    website: formToken.value.website
  };
});

// Check if form has changes
const hasChanges = computed(() => {
  if (!token.value) return false;

  return formToken.value.name !== (token.value.name || '') ||
         formToken.value.symbol !== (token.value.symbol || '') ||
         formToken.value.description !== (token.value.description || '') ||
         formToken.value.image !== (token.value.image || '') ||
         formToken.value.website !== (token.value.website || '');
});

// Load token details
const loadTokenDetails = async () => {
  try {
    // Fetch token details by Asset Num
    token.value = await tokensStore.getTokenByAssetNum(assetNum.value);

    // Populate form token
    formToken.value = {
      isNft: token.value.isNft,
      nai: token.value.nai,
      assetNum: token.value.assetNum,
      isStaked: token.value.isStaked,
      precision: token.value.precision,
      metadata: token.value.metadata,
      name: token.value.name,
      symbol: token.value.symbol,
      description: token.value.description,
      image: token.value.image,
      website: token.value.website,
      othersCanStake: token.value.othersCanStake,
      othersCanUnstake: token.value.othersCanUnstake
    };
  } catch (error) {
    toastError('Failed to load token details', error);
    router.push('/tokens/list');
  }
};

// Handle token update from TokenCreationCard
const handleTokenUpdate = (updatedToken: CTokenDisplayBase & { othersCanStake: boolean; othersCanUnstake: boolean }) => {
  formToken.value = updatedToken;
};

// Handle save changes
const handleSaveChanges = async () => {
  if (!token.value || !isTokenOwner.value || !isFormValid.value) {
    toastError('Cannot update token', new Error('Invalid form or insufficient permissions'));
    return;
  }

  try {
    isUpdating.value = true;

    // Prepare metadata
    const metadata = {
      name: (formToken.value.name || '').trim(),
      symbol: (formToken.value.symbol || '').trim().toUpperCase(),
      description: (formToken.value.description || '').trim(),
      image: (formToken.value.image || '').trim(),
      website: (formToken.value.website || '').trim()
    };

    // Wait for transaction status
    await waitForTransactionStatus(
      () => ([{
        asset_metadata_update_operation: {
          identifier: {
            amount: '0',
            nai: token.value!.nai!,
            precision: token.value!.precision!
          },
          owner: tokensStore.getUserPublicKey()!,
          metadata: {
            items: Object.entries(metadata).map(([key, value]) => ({
              key,
              value
            }))
          }
        }
      } satisfies htm_operation]),
      'Token metadata update'
    );

    router.push({
      path: '/tokens/token',
      query: {
        'asset-num': token.value!.assetNum
      }
    });
  } catch (error) {
    toastError('Failed to update token metadata', error);
  } finally {
    isUpdating.value = false;
  }
};

const handleInit = async () => {
  if (!isLoggedIn.value)
    return;


  isLoading.value = true;
  await loadTokenDetails();
  isLoading.value = false;

  // Check ownership after loading
  if (!isTokenOwner.value) {
    toastError('You do not have permission to edit this token');
    router.push({
      path: '/tokens/token',
      query: { 'asset-num': assetNum.value }
    });
  }
};

watch(isLoggedIn, () => {
  void handleInit();
});

// Initialize
onMounted(() => {
  void handleInit();
});
</script>

<template>
  <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <NuxtLink :to="`/tokens/token?asset-num=${assetNum}`" class="keychainify-checked">
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
              :d="mdiArrowLeft"
            />
          </svg>
          Back to Token
        </Button>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="space-y-6"
    >
      <Card>
        <CardHeader>
          <Skeleton class="h-8 w-48" />
          <Skeleton class="h-4 w-64" />
        </CardHeader>
        <CardContent class="space-y-4">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-24 w-full" />
        </CardContent>
      </Card>
    </div>

    <!-- Edit Form -->
    <div
      v-else-if="token && isTokenOwner"
      class="space-y-6"
    >
      <!-- Page Title -->
      <div>
        <h1 class="text-3xl font-bold text-foreground mb-2">
          Edit Token Definition
        </h1>
        <p class="text-muted-foreground">
          Update the metadata for your token. Only the token owner can make these changes.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Token Metadata Form -->
        <TokenCreationCard
          :token="formToken"
          :is-submitting="isUpdating"
          :symbol-validation="symbolValidation"
          mode="edit"
          @update:token="handleTokenUpdate"
        />

        <!-- Token Preview -->
        <div class="space-y-6">
          <HTMTokenPreview
            v-if="previewToken"
            :token="previewToken"
          />

          <!-- Technical Info Alert -->
          <Alert>
            <AlertDescription>
              <div class="">
                <p class="font-semibold">
                  Technical Information (Cannot be changed)
                </p>
                <div class="flex flex-wrap gap-4 mt-2 text-sm">
                  <div>
                    <span class="text-muted-foreground">Asset num:</span>
                    <span class="ml-1 font-mono">{{ token.assetNum }}</span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Precision:</span>
                    <span class="ml-1 font-mono">{{ token.precision }}</span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Owner:</span>
                    <span class="ml-1 font-mono text-xs break-all">{{ token.ownerPublicKey }}</span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <!-- Action Buttons -->
          <div class="flex gap-4">
            <NuxtLink :to="`/tokens/token?asset-num=${assetNum}`" class="keychainify-checked">
              <Button
                variant="outline"
                size="lg"
                class="flex-1"
                :disabled="isUpdating"
              >
                Cancel
              </Button>
            </NuxtLink>
            <Button
              size="lg"
              class="flex-1 gap-2"
              :disabled="isUpdating || !isFormValid || !hasChanges"
              @click="handleSaveChanges"
            >
              <svg
                v-if="isUpdating"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="animate-spin"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiLoading"
                />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiContentSave"
                />
              </svg>
              {{ isUpdating ? 'Updating...' : 'Save Changes' }}
            </Button>
          </div>

          <!-- Info message if no changes -->
          <Alert v-if="!hasChanges && !isUpdating">
            <AlertDescription>
              No changes detected. Modify the fields above to update your token metadata.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  </div>
</template>
