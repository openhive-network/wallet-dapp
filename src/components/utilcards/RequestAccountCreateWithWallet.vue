<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AccountNameInput from '@/components/ui/AccountNameInput.vue';
import ExpandablePanel from '@/components/utilcards/ExpandablePanel.vue';
import ShareAccountCreationLink from '@/components/utilcards/ShareAccountCreationLink.vue';
import HiveFriendHelpText from '@/components/ui/HiveFriendHelpText.vue';
import HiveFriendHelpTooltip from '@/components/ui/HiveFriendHelpTooltip.vue';
import { mdiAccountPlusOutline, mdiLinkVariant, mdiCheckCircle, mdiHelpCircleOutline, mdiShieldCheckOutline } from '@mdi/js';
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { toastError } from '@/utils/parse-error';
import { useWalletStore } from '@/stores/wallet.store';
import { useMetamaskStore } from '@/stores/metamask.store';
import { getWalletIcon, UsedWallet } from '@/stores/settings.store';
import type { TRole } from '@hiveio/wax/vite';
import { toast } from 'vue-sonner';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';

const walletStore = useWalletStore();
const metamaskStore = useMetamaskStore();

const publicKeys = ref<Record<TRole, string>>({
  owner: "",
  active: "",
  posting: "",
  memo: ""
});

const accountNameValid = ref(false);
const createAccountNameOperation = ref('');

// Handle account name validation from the component
const onAccountNameValidationChange = (isValid: boolean) => {
  accountNameValid.value = isValid;
};

const isLoading = ref(false);
const hasCopiedCreateSignLink = ref(false);
const isMetamaskConnected = ref(false);
const isMetamaskSnapInstalled = ref(false);
const isVerifyingWallet = ref(true);

const parseMetamaskPublicKeys = async() => {
  const toastToDismiss = toast.loading("Metamask detected. Parsing public keys...");

  try {
    isLoading.value = true;

    try {
      await metamaskStore.connect(0);
      isMetamaskConnected.value = metamaskStore.isConnected;
    } catch {
      toast.error("Metamask is not installed or not connected");
      return;
    }

    publicKeys.value = await metamaskStore.metamask!.getPublicKeys("owner", "active", "posting", "memo");
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled!;

    toast.success("Successfully parsed Metamask public keys");
  } catch (error) {
    toastError("Failed to parse Metamask public keys", error);
    throw error;
  } finally {
    isLoading.value = false;
    toast.dismiss(toastToDismiss);
  }
};

const connectMetamask = async() => {
  isLoading.value = true;
  try {
    await metamaskStore.connect(0);
    isMetamaskConnected.value = metamaskStore.isConnected;
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled!;

    if (isMetamaskSnapInstalled.value) {
      await parseMetamaskPublicKeys();
    }
  } catch (error) {
    toastError("Failed to connect to Metamask", error);
  } finally {
    isLoading.value = false;
  }
};

const installMetamaskSnap = async() => {
  isLoading.value = true;
  try {
    await metamaskStore.install();
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled!;

    if (isMetamaskSnapInstalled.value) {
      await parseMetamaskPublicKeys();
    }
  } catch (error) {
    toastError("Failed to install Metamask Snap", error);
  } finally {
    isLoading.value = false;
  }
};

const hasMetamaskWithSnap = computed(() =>
  walletStore.walletsStatus.metamask &&
  isMetamaskConnected.value &&
  isMetamaskSnapInstalled.value
);

onMounted(async () => {
  try {
    const isMetamaskInstalled = await MetaMaskProvider.isExtensionInstalled();

    isVerifyingWallet.value = false;

    if (isMetamaskInstalled && metamaskStore.isInstalled) {
      void parseMetamaskPublicKeys();
    }
  } catch (error) {
    isVerifyingWallet.value = false;
  }

  const stopWatcher = watch(
    () => walletStore.walletsStatus.metamask,
    (isMetamaskDetected) => {
      if (isMetamaskDetected && metamaskStore.isInstalled) {
        void parseMetamaskPublicKeys();
      }
    }
  );

  onBeforeUnmount(() => {
    stopWatcher();
  });
});

const getAccountCreateSigningLink = (): string => {
  const accountName = createAccountNameOperation.value!.startsWith('@') ? createAccountNameOperation.value!.slice(1) : createAccountNameOperation.value!;
  hasCopiedCreateSignLink.value = true;
  return `${window.location.protocol}//${window.location.host}/account/create?acc=${accountName}&${Object.entries(publicKeys.value).map(([role, key]) => `${role}=${key}`).join('&')}`;
};
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center" :class="{ 'justify-between': !hasMetamaskWithSnap }">
        <img v-if="hasMetamaskWithSnap" :src="getWalletIcon(UsedWallet.METAMASK)" class="w-[20px] mr-2" />
        <span class="ml-1">MetaMask integrated onboarding</span>
        <svg v-if="!hasMetamaskWithSnap" width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountPlusOutline"/>
        </svg>
      </CardTitle>
      <CardDescription class="mr-8 ml-1">
        <HiveFriendHelpTooltip>
          <template #default>
            <span class="text-left">
              Connect your wallet and fill in the form below to prepare an account creation link shared with your Hive friend.
              <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block align-text-bottom">
                <path style="fill: currentColor" :d="mdiHelpCircleOutline"/>
              </svg>
            </span>
          </template>
        </HiveFriendHelpTooltip>
      </CardDescription>
    </CardHeader>
    <CardContent class="text-sm">
      <div v-if="!isMetamaskConnected" class="space-y-4">
        <p>Step 1: Connect your Metamask wallet:</p>
        <div class="flex justify-center">
          <Button
            :disabled="!walletStore.walletsStatus.metamask || isLoading"
            variant="outline"
            size="lg"
            class="px-8 py-4 border-[#FF5C16] border-[2px]"
            @click="connectMetamask"
          >
            <img :src="getWalletIcon(UsedWallet.METAMASK)" class="w-[20px] mr-2" />
            <span class="text-md font-bold">Connect Metamask</span>
          </Button>
        </div>
        <div v-if="isVerifyingWallet" class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="status">
          <div class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <div>
              <p class="font-bold">Verifying wallet installation...</p>
              <p>Checking if Metamask extension is installed.</p>
            </div>
          </div>
        </div>
        <div v-else-if="!walletStore.walletsStatus.metamask" class="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4" role="alert">
          <p class="font-bold">Metamask not detected</p>
          <p>Please install Metamask extension to continue with wallet-based account creation.</p>
        </div>
      </div>
      <div v-else-if="isMetamaskConnected && !isMetamaskSnapInstalled" class="space-y-4">
        <p>Step 2: Install our Hive Wallet snap:</p>
        <div class="flex justify-center">
          <Button
            :disabled="isLoading"
            variant="outline"
            size="lg"
            class="px-8 py-4 border-[#FF5C16] border-[2px]"
            @click="installMetamaskSnap"
          >
            <span class="text-md font-bold">Install Hive Snap</span>
          </Button>
        </div>
      </div>
      <div v-else-if="hasMetamaskWithSnap" class="space-y-4">
        <p class="mb-4">Step 3: Request account creation</p>
        <AccountNameInput
          v-model="createAccountNameOperation"
          @validation-change="onAccountNameValidationChange"
          id="wallet_account_name"
          label="New account name"
          placeholder="Enter desired account name"
        />
        <div class="border p-4 rounded-md">
          <div class="flex items-start">
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2 mt-0.5 flex-shrink-0">
              <path style="fill: currentColor" :d="mdiShieldCheckOutline"/>
            </svg>
            <div class="text-sm">
              <p class="font-bold mb-1">Secure Key Generation</p>
              <p>
                Secret part of authority data specified for your new Hive account has been generated from your Secure Recovery Phrase and saved by MetaMask wallet.
              </p>
            </div>
          </div>
        </div>
        <ExpandablePanel :publicKeys="publicKeys" />
        <Button
          :copy="getAccountCreateSigningLink"
          :disabled="isLoading || !createAccountNameOperation || !accountNameValid"
          class="w-full"
          variant="default"
        >
          <div class="flex items-center justify-center">
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2">
              <path style="fill: currentColor" :d="mdiLinkVariant"/>
            </svg>
            <span>Copy Account Creation Link</span>
          </div>
        </Button>
        <p v-if="hasCopiedCreateSignLink" class="flex items-center justify-center text-sm space-x-2 text-green-600">
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill: currentColor" :d="mdiCheckCircle"/>
          </svg>
          <span>
            Link copied! Now send this link to someone who has an account to execute this operation in blockchain
          </span>
        </p>
        <HiveFriendHelpText />
        <ShareAccountCreationLink
          :visible="hasCopiedCreateSignLink"
          :account-name="createAccountNameOperation"
          :get-link-function="getAccountCreateSigningLink"
        />
      </div>
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="flex items-center space-x-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span class="text-sm">Processing...</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>