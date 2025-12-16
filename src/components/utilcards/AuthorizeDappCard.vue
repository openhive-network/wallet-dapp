<script lang="ts" setup>
import { Globe, Check, Users, AlertCircle, Clock } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Button from '@/components/ui/button/Button.vue';
import Skeleton from '@/components/ui/skeleton/Skeleton.vue';
import { stringifyWalletName, useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';

const userStore = useUserStore();
const settings = useSettingsStore();
const walletStore = useWalletStore();

const hasWallet = computed(() => walletStore.hasWallet);
const wallet = computed(() => walletStore.wallet);

const props = defineProps<{
  app: string;
  code: string;
}>();

const appData = ref<null | {
  accountName: string;
  displayName?: string;
  profileImage?: string;
  about?: string;
  website?: string;
  createdAt: Date;
  createdAgo: string;
  reputationScore: number;
  reputation: string;
}>(null);

const isLoading = ref(true);

const authorized = ref(false);

const failed = ref(false);

const fetchAppMetadata = async () => {
  isLoading.value = true;
  try {
    appData.value = await userStore.getAccountMetadata(props.app);
  } catch (e) {
    toastError('Failed to fetch dApp metadata', e);
    failed.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  void fetchAppMetadata();
});

const isAuthorizing = ref(false);
const authorize = async () => {
  if (isAuthorizing.value) return;
  isAuthorizing.value = true;
  try {
    if (!hasWallet.value)
      await walletStore.openWalletSelectModal();

    const wax = await getWax();

    const tx = await wax.createTransaction();
    tx.pushOperation({
      custom_json_operation: {
        required_auths: [],
        required_posting_auths: [settings.account!],
        id: 'dappauth',
        json: JSON.stringify({
          dapp: props.app,
          code: props.code,
          layer: walletStore.isL2Wallet ? '2' : '1'
        })
      }
    });

    try {
      await walletStore.createWalletFor(settings.settings, 'posting');
    } catch (error) {
      toastError(`Could not create a wallet using ${stringifyWalletName(settings.settings.wallet!)} - role posting`, error);
      return;
    }

    await wallet.value!.signTransaction(tx);

    await wax.broadcast(tx);

    toast.success(`Successfully authorized ${props.app}`);
    authorized.value = true;
  } catch (e) {
    toastError('Failed to authorize dApp', e);
  } finally {
    isAuthorizing.value = false;
  }
};
</script>

<template>
  <div>
    <div
      v-if="failed"
      class="rounded-lg shadow border w-full max-w-[500px] p-4 sm:p-8"
    >
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Could not load dApp information for <code class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">{{ props.app }}</code>.<br>
          Please check the app name and try again.
        </AlertDescription>
      </Alert>
    </div>
    <div
      v-else
      class="rounded-lg shadow border w-full max-w-[500px] p-4 sm:p-8"
    >
      <!-- Header Section -->
      <div class="text-center mb-8">
        <!-- App Icons -->
        <div class="flex items-center justify-center mb-6">
          <div class="relative flex items-center">
            <!-- User Avatar -->
            <div class="w-16 h-16 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center">
              <Avatar class="w-full h-full">
                <AvatarImage
                  v-if="userStore.profileImage"
                  :src="userStore.profileImage"
                />
                <AvatarFallback v-if="settings.isLoaded">
                  {{ settings.settings.account?.slice(0, 2) }}
                </AvatarFallback>
              </Avatar>
            </div>

            <!-- Dashed connecting line -->
            <div class="mx-0 flex-1 border-t-2 border-dashed border-gray-300 dark:border-gray-600 relative w-[60px] sm:w-[100px]">
              <!-- Connection indicator -->
              <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check class="w-4 h-4 text-white" />
              </div>
            </div>

            <!-- DApp Logo -->
            <div class="w-16 h-16 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center">
              <template v-if="isLoading">
                <Skeleton class="w-16 h-16 rounded-full" />
              </template>
              <template v-else-if="appData?.profileImage">
                <img
                  :src="appData.profileImage"
                  :alt="`${appData.accountName} logo`"
                  class="w-16 h-16 rounded-full object-cover"
                >
              </template>
              <template v-else>
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full" />
              </template>
            </div>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          <template v-if="isLoading">
            <Skeleton class="h-6 w-48 mx-auto" />
          </template>
          <template v-else>
            Authorize {{ appData?.displayName || props.app }}
          </template>
        </h1>
      </div>

      <!-- Authorization Details -->
      <div class="border rounded-lg p-4 mb-6">
        <!-- App Info -->
        <div class="flex items-start mb-4">
          <div class="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 overflow-hidden mr-3 flex-shrink-0">
            <template v-if="isLoading">
              <Skeleton class="w-8 h-8 rounded-full" />
            </template>
            <template v-else-if="appData?.profileImage">
              <img
                :src="appData.profileImage"
                :alt="`${appData.accountName} logo`"
                class="w-8 h-8 object-cover"
              >
            </template>
            <template v-else>
              <div class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </template>
          </div>

          <div class="flex-1">
            <div class="flex items-center">
              <template v-if="isLoading">
                <Skeleton class="h-4 w-24" />
              </template>
              <template v-else>
                <span class="font-medium text-gray-900 dark:text-gray-100 break-all">{{ appData?.displayName || props.app }}</span>
                <span class="text-gray-500 dark:text-gray-400 text-sm ml-1">by</span>
                <span class="text-blue-600 dark:text-blue-400 text-sm ml-1 break-all">
                  <a
                    target="_blank"
                    :href="'https://hive.blog/@' + props.app"
                  >{{ props.app }}</a>
                </span>
              </template>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300 ml-[1px]">
              <template v-if="isLoading">
                <Skeleton class="h-4 w-32 mt-1" />
              </template>
              <template v-else>
                wants to access your <span class="font-medium">{{ userStore.userDisplayName }}</span> account
              </template>
            </div>
          </div>
        </div>

        <!-- Permissions -->
        <div class="flex items-start">
          <Globe class="w-8 h-8 text-gray-600 dark:text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <div class="font-medium text-gray-900 dark:text-gray-100">
              Public data only
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300 ml-[1px]">
              Limited access to your public data
            </div>
          </div>
        </div>
      </div>

      <!-- Authorize Button -->
      <div class="flex items-center justify-center mb-4">
        <Button
          :disabled="isLoading || authorized"
          :loading="isAuthorizing"
          @click="authorize"
        >
          {{ authorized ? 'Authorized' : `Authorize ${props.app}` }}
        </Button>
      </div>

      <!-- Redirect Notice -->
      <div class="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
        <template v-if="isLoading">
          <Skeleton class="h-4 w-48 mx-auto mb-1" />
          <Skeleton class="h-4 w-36 mx-auto" />
        </template>
        <template v-else>
          Authorizing will broadcast operation with<br>custom app code
          <code class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">{{ props.code }}</code>
          to the Hive blockchain
        </template>
      </div>

      <!-- App Stats -->
      <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-4">
        <div class="flex items-center">
          <AlertCircle class="w-4 h-4 mr-1" />
          <span><b>Not</b> owned or<br>operated by Hive Bridge</span>
        </div>
        <div class="flex items-center">
          <Clock class="w-4 h-4 mr-1" />
          <span v-if="isLoading">
            <Skeleton class="h-4 w-16" />
          </span>
          <span v-else>
            <span>Created<br><b>{{ appData?.createdAgo }}</b></span>
          </span>
        </div>
        <div class="flex items-center">
          <Users class="w-4 h-4 mr-1" />
          <span v-if="isLoading">
            <Skeleton class="h-4 w-16" />
          </span>
          <span v-else>
            <span>Reputation<br><b>{{ appData?.reputation }}</b></span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
