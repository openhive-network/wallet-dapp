<script setup lang="ts">
import { mdiArrowLeft, mdiContentSave, mdiLoading } from '@mdi/js';
import type { htm_operation } from '@mtyszczak-cargo/htm';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMView from '@/components/HTMView.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import { waitForTransactionStatus } from '@/utils/transaction-status';
import type { CtokensAppToken } from '@/utils/wallet/ctokens/api';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

// Router
const route = useRoute();
const router = useRouter();

// Stores
const tokensStore = useTokensStore();
const settingsStore = useSettingsStore();

// State
const token = ref<CtokensAppToken | null>(null);
const isLoading = ref(true);
const isUpdating = ref(false);

// Form state
const form = ref({
  name: '',
  symbol: '',
  description: '',
  image: '',
  website: ''
});

// Get NAI and precision from route parameters
const nai = computed(() => route.query.nai as string);
const precision = computed(() => route.query.precision);

// Check if user is logged in
const isLoggedIn = computed(() => !!settingsStore.settings.account);

// Check if current user is the token owner
const isTokenOwner = computed(() => {
  if (!token.value?.owner || !CTokensProvider.getOperationalPublicKey()) return false;
  return token.value.owner === CTokensProvider.getOperationalPublicKey();
});

// Computed properties for display
const tokenImage = computed(() => {
  return form.value.image || '';
});

// Form validation
const isFormValid = computed(() => {
  return form.value.name.trim() !== '' &&
         form.value.symbol.trim() !== '' &&
         form.value.symbol.length >= 3 &&
         form.value.symbol.length <= 10 &&
         /^[A-Z]+$/i.test(form.value.symbol.trim());
});

// Check if form has changes
const hasChanges = computed(() => {
  if (!token.value) return false;
  const metadata = token.value.metadata as {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    website?: string;
  } | undefined;

  return form.value.name !== (metadata?.name || '') ||
         form.value.symbol !== (metadata?.symbol || '') ||
         form.value.description !== (metadata?.description || '') ||
         form.value.image !== (metadata?.image || '') ||
         form.value.website !== (metadata?.website || '');
});

// Load token details
const loadTokenDetails = async () => {
  try {
    const wax = await getWax();

    // Fetch token details by NAI
    const tokens = await wax.restApi.ctokensApi.registeredTokens({
      nai: nai.value,
      precision: Number(precision.value!)
    });

    if (!tokens || tokens.length === 0)
      throw new Error(`Token with NAI ${nai.value} not found`);

    token.value = tokens[0]!.liquid?.nai === nai.value ? tokens[0]!.liquid! : tokens[0]?.vesting?.nai === nai.value ? tokens[0]!.vesting! : null;

    if (!token.value)
      throw new Error(`Token with NAI ${nai.value} not found`);

    // Populate form with existing metadata
    const metadata = token.value.metadata as {
      name?: string;
      symbol?: string;
      description?: string;
      image?: string;
      website?: string;
    } | undefined;

    form.value.name = metadata?.name || '';
    form.value.symbol = metadata?.symbol || '';
    form.value.description = metadata?.description || '';
    form.value.image = metadata?.image || '';
    form.value.website = metadata?.website || '';

  } catch (error) {
    toastError('Failed to load token details', error);
    router.push('/tokens/list');
  }
};

// Handle token update
const handleUpdateToken = async () => {
  if (!token.value || !isTokenOwner.value || !isFormValid.value) {
    toastError('Cannot update token', new Error('Invalid form or insufficient permissions'));
    return;
  }

  try {
    isUpdating.value = true;

    // Prepare metadata
    const metadata = {
      name: form.value.name.trim(),
      symbol: form.value.symbol.trim().toUpperCase(),
      description: form.value.description.trim(),
      image: form.value.image.trim(),
      website: form.value.website.trim()
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
          owner: CTokensProvider.getOperationalPublicKey()!,
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

    // Refresh token data after update
    await tokensStore.loadRegisteredTokens(token.value!.nai, token.value!.precision, 1, true);

    router.push({
      path: '/tokens/token',
      query: {
        nai: token.value!.nai,
        precision: token.value!.precision
      }
    });
  } catch (error) {
    toastError('Failed to update token metadata', error);
  } finally {
    isUpdating.value = false;
  }
};

// Navigate back to token detail
const goBack = () => {
  router.push({
    path: '/tokens/token',
    query: { nai: nai.value, precision: precision.value }
  });
};

// Initialize
onMounted(async () => {
  if (!isLoggedIn.value) {
    toast.error('You must be logged in to edit tokens');
    router.push('/');
    return;
  }

  isLoading.value = true;
  await loadTokenDetails();
  isLoading.value = false;

  // Check ownership after loading
  if (!isTokenOwner.value) {
    toast.error('You do not have permission to edit this token');
    router.push({
      path: '/tokens/token',
      query: { nai: nai.value, precision: precision.value }
    });
  }
});
</script>

<template>
  <HTMView>
    <div class="container mx-auto py-4 sm:py-6 space-y-6 px-4 max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          class="gap-2 hover:bg-accent"
          @click="goBack"
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

        <!-- Token Preview Card -->
        <Card>
          <CardHeader>
            <CardTitle>Token Preview</CardTitle>
            <CardDescription>
              How your token will appear to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center gap-4">
              <Avatar class="h-16 w-16">
                <AvatarImage
                  v-if="tokenImage"
                  :src="tokenImage"
                  :alt="form.name || 'Token'"
                />
                <AvatarFallback class="bg-primary/10">
                  <span class="text-xl font-bold text-primary">
                    {{ form.symbol ? form.symbol.slice(0, 2).toUpperCase() : 'TK' }}
                  </span>
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 class="text-xl font-bold">
                  {{ form.name || 'Token Name' }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ form.symbol || 'SYMBOL' }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-4">
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                  token?.is_nft ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                ]"
              >
                {{ token?.is_nft ? 'NFT' : 'Fungible' }}
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                  token?.others_can_stake ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                ]"
              >
                {{ token?.others_can_stake ? 'Staking ✓' : 'Staking ✗' }}
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
                  token?.others_can_unstake ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                ]"
              >
                {{ token?.others_can_unstake ? 'Unstaking ✓' : 'Unstaking ✗' }}
              </span>
            </div>
          </CardContent>
        </Card>

        <!-- Edit Form Card -->
        <Card>
          <CardHeader>
            <CardTitle>Token Metadata</CardTitle>
            <CardDescription>
              Edit the display information for your token
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Token Name -->
            <div class="space-y-2">
              <Label
                for="name"
                class="text-sm font-medium text-foreground"
              >
                Token Name <span class="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                v-model="form.name"
                placeholder="e.g., My Awesome Token"
                :disabled="isUpdating"
                class="transition-colors"
              />
              <p class="text-xs text-muted-foreground">
                The full name of your token
              </p>
            </div>

            <Separator />

            <!-- Token Symbol -->
            <div class="space-y-2">
              <Label
                for="symbol"
                class="text-sm font-medium text-foreground"
              >
                Token Symbol <span class="text-red-500">*</span>
              </Label>
              <Input
                id="symbol"
                v-model="form.symbol"
                placeholder="e.g., MAT"
                :disabled="isUpdating"
                class="transition-colors uppercase"
                maxlength="10"
              />
              <p class="text-xs text-muted-foreground">
                3-10 uppercase letters (e.g., BTC, ETH, HIVE)
              </p>
              <p
                v-if="form.symbol && !/^[A-Z]+$/i.test(form.symbol.trim())"
                class="text-xs text-red-500"
              >
                Symbol must contain only letters
              </p>
              <p
                v-if="form.symbol && (form.symbol.length < 3 || form.symbol.length > 10)"
                class="text-xs text-red-500"
              >
                Symbol must be 3-10 characters
              </p>
            </div>

            <Separator />

            <!-- Description -->
            <div class="space-y-2">
              <Label
                for="description"
                class="text-sm font-medium text-foreground"
              >
                Description
              </Label>
              <Textarea
                id="description"
                v-model="form.description"
                placeholder="Describe your token's purpose and features..."
                rows="4"
                :disabled="isUpdating"
                class="resize-none"
              />
              <p class="text-xs text-muted-foreground">
                A brief description of what your token represents
              </p>
            </div>

            <Separator />

            <!-- Image URL -->
            <div class="space-y-2">
              <Label
                for="image"
                class="text-sm font-medium text-foreground"
              >
                Image URL
              </Label>
              <Input
                id="image"
                v-model="form.image"
                type="url"
                placeholder="https://example.com/token-logo.png"
                :disabled="isUpdating"
                class="transition-colors font-mono text-sm"
              />
              <p class="text-xs text-muted-foreground">
                URL to your token's logo or icon (recommended: square, 512x512px)
              </p>
            </div>

            <Separator />

            <!-- Website URL -->
            <div class="space-y-2">
              <Label
                for="website"
                class="text-sm font-medium text-foreground"
              >
                Website URL
              </Label>
              <Input
                id="website"
                v-model="form.website"
                type="url"
                placeholder="https://example.com"
                :disabled="isUpdating"
                class="transition-colors font-mono text-sm"
              />
              <p class="text-xs text-muted-foreground">
                Official website for your token project
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Technical Info Alert -->
        <Alert>
          <AlertDescription>
            <div class="">
              <p class="font-semibold">
                Technical Information (Cannot be changed)
              </p>
              <div class="flex flex-wrap gap-4 mt-2 text-sm">
                <div>
                  <span class="text-muted-foreground">NAI:</span>
                  <span class="ml-1 font-mono">{{ token.nai }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Precision:</span>
                  <span class="ml-1 font-mono">{{ token.precision }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Owner:</span>
                  <span class="ml-1 font-mono text-xs">{{ token.owner }}</span>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <!-- Action Buttons -->
        <div class="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            class="flex-1"
            :disabled="isUpdating"
            @click="goBack"
          >
            Cancel
          </Button>
          <Button
            size="lg"
            class="flex-1 gap-2"
            :disabled="isUpdating || !isFormValid || !hasChanges"
            @click="handleUpdateToken"
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
  </HTMView>
</template>
