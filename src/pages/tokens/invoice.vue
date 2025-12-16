<script setup lang="ts">
import { mdiArrowLeft, mdiDownload } from '@mdi/js';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTokensStore, type CTokenDefinitionDisplay } from '@/stores/tokens.store';
import { toastError } from '@/utils/parse-error';

definePageMeta({
  layout: 'htm'
});

// Router
const route = useRoute();
const router = useRouter();

// Stores
const tokensStore = useTokensStore();

// State
const token = ref<CTokenDefinitionDisplay | null>(null);
const isLoading = ref(true);

// Get params from route
const fromName = computed(() => route.query.fromName as string | undefined);
const fromPk = computed(() => route.query.fromPk as string);
const toName = computed(() => route.query.toName as string | undefined);
const toPk = computed(() => route.query.toPk as string);
const amount = computed(() => route.query.amount as string);
const assetNum = computed(() => Number(route.query['asset-num']));
const memo = computed(() => route.query.memo as string | undefined);

// Invoice metadata
const invoiceNumber = computed(() => {
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${timestamp}`;
});

const invoiceDate = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

const tokenSymbol = computed(() => {
  if (!token.value) return '';
  const metadata = token.value.metadata as { symbol?: string } | undefined;
  return metadata?.symbol || '';
});

// Format amount for display
const formattedAmount = computed(() => {
  if (!amount.value || !token.value) return '0.00';
  const prec = token.value.precision || 0;
  return parseFloat(amount.value).toFixed(prec);
});

// Mock download functions
const downloadAsPDF = () => {
  toast.warning('PDF download functionality - coming soon!');
  // TODO: Implement actual PDF generation
};

const downloadAsImage = () => {
  toast.warning('Image download functionality - coming soon!');
  // TODO: Implement actual image generation
};

// Navigate back
const goBack = () => {
  router.back();
};

// Load token details
const loadTokenDetails = async () => {
  try {
    // Fetch token details by asset number
    token.value = await tokensStore.getTokenByAssetNum(assetNum.value);
  } catch (error) {
    toastError('Failed to load token details', error);
    router.push('/tokens/list');
  }
};

// Initialize
onMounted(async () => {
  // Validate required params
  if (!fromPk.value || !toPk.value || !amount.value || !assetNum.value) {
    toastError('Missing required invoice parameters');
    router.push('/tokens/list');
    return;
  }

  isLoading.value = true;
  await loadTokenDetails();
  isLoading.value = false;
});
</script>

<template>
  <div class="container mx-auto py-4 sm:py-6 space-y-6 px-2 sm:px-4 max-w-2xl">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="sm"
        class="gap-2 hover:bg-accent w-fit"
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
        Back
      </Button>
      <NuxtLink
        v-if="assetNum"
        :to="`/tokens/token?asset-num=${assetNum}`"
        class="keychainify-checked"
      >
        <Button
          variant="outline"
          size="sm"
          class="gap-2"
        >
          <span class="hidden sm:inline">Back to Token</span>
          <span class="sm:hidden">Token</span>
        </Button>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="space-y-6"
    >
      <Card>
        <CardContent class="p-8">
          <Skeleton class="h-64 w-full" />
        </CardContent>
      </Card>
    </div>

    <!-- Invoice -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Invoice Card -->
      <Card class="border-2">
        <CardContent class="p-4 sm:p-8 md:p-12">
          <div class="space-y-8">
            <!-- Header Section -->
            <div class="text-center border-b pb-6">
              <div class="text-sm text-muted-foreground mb-1">
                {{ fromName || 'Sender' }}
              </div>
              <div
                v-if="fromPk"
                class="text-xs text-muted-foreground font-mono mb-4 break-all"
              >
                {{ fromPk }}
              </div>
              <h1 class="text-3xl font-bold tracking-tight">
                INVOICE
              </h1>
            </div>

            <!-- Invoice Details -->
            <div class="flex justify-between text-sm">
              <div>
                <div class="text-muted-foreground">
                  Invoice#
                </div>
                <div class="font-medium">
                  {{ invoiceNumber }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-muted-foreground">
                  Date
                </div>
                <div class="font-medium">
                  {{ invoiceDate }}
                </div>
              </div>
            </div>

            <Separator />

            <!-- Items Table -->
            <div class="space-y-4">
              <div class="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div class="col-span-1">
                  #
                </div>
                <div class="col-span-5">
                  Item
                </div>
                <div class="col-span-2 text-center">
                  Qty
                </div>
                <div class="col-span-2 text-right">
                  Rate
                </div>
                <div class="col-span-2 text-right">
                  Amount
                </div>
              </div>

              <!-- Item Row -->
              <div class="grid grid-cols-12 gap-4 text-sm">
                <div class="col-span-1">
                  1
                </div>
                <div class="col-span-5">
                  <div class="font-medium">
                    Token Transfer
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">
                    {{ tokenSymbol }}
                    <span
                      v-if="!fromName || !toName"
                      class="text-muted-foreground/70"
                    >
                      ({{ assetNum }})
                    </span>
                  </div>
                </div>
                <div class="col-span-2 text-center">
                  1.00
                </div>
                <div class="col-span-2 text-right">
                  {{ formattedAmount }}
                </div>
                <div class="col-span-2 text-right font-medium">
                  {{ formattedAmount }}
                </div>
              </div>

              <Separator class="my-4" />

              <!-- Subtotal -->
              <div class="flex justify-end">
                <div class="w-full sm:w-64 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Sub Total</span>
                    <span class="font-medium">{{ formattedAmount }}</span>
                  </div>
                  <Separator />
                  <div class="flex justify-between text-base font-bold">
                    <span>TOTAL</span>
                    <span>{{ formattedAmount }}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <!-- Recipient Section -->
            <div class="space-y-3">
              <div class="bg-muted/30 p-4 rounded-lg space-y-2">
                <div class="text-sm font-medium">
                  Recipient:
                </div>
                <div
                  v-if="toPk"
                  class="text-xs font-mono text-muted-foreground break-all"
                >
                  {{ toPk }}
                </div>
              </div>
            </div>

            <!-- Memo Section -->
            <div
              v-if="memo"
              class="space-y-3"
            >
              <div class="text-sm font-medium">
                Memo:
              </div>
              <div class="bg-muted/30 p-4 rounded-lg">
                <p class="text-sm text-muted-foreground whitespace-pre-wrap">
                  {{ memo }}
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="text-center text-sm text-muted-foreground pt-6 border-t">
              Thanks for your business.
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3">
        <Button
          class="flex-1 gap-2"
          @click="downloadAsPDF"
        >
          <svg
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="flex-shrink-0"
          >
            <path
              style="fill: currentColor"
              :d="mdiDownload"
            />
          </svg>
          Download as PDF
        </Button>
        <Button
          variant="outline"
          class="flex-1 gap-2"
          @click="downloadAsImage"
        >
          <svg
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="flex-shrink-0"
          >
            <path
              style="fill: currentColor"
              :d="mdiDownload"
            />
          </svg>
          Download as Image
        </Button>
      </div>
    </div>
  </div>
</template>
