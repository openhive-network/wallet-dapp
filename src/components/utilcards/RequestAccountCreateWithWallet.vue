<script setup lang="ts">
import type { TRole } from '@hiveio/wax/vite';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';
import { mdiAccountPlusOutline, mdiHelpCircleOutline, mdiShieldCheckOutline } from '@mdi/js';
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { toast } from 'vue-sonner';

import AccountNameInput from '@/components/ui/AccountNameInput.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import HiveFriendHelpTooltip from '@/components/ui/HiveFriendHelpTooltip.vue';
import ExpandablePanel from '@/components/utilcards/ExpandablePanel.vue';
import { useMetamaskStore } from '@/stores/metamask.store';
import { getWalletIcon, UsedWallet } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';

import AccountCreationActionButtons from '../ui/AccountCreationActionButtons.vue';

const walletStore = useWalletStore();
const metamaskStore = useMetamaskStore();

const publicKeys = ref<Record<TRole, string>>({
  owner: '',
  active: '',
  posting: '',
  memo: ''
});

const accountNameValid = ref(false);
const createAccountNameOperation = ref('');

// Handle account name validation from the component
const onAccountNameValidationChange = (isValid: boolean) => {
  accountNameValid.value = isValid;
};

const isLoading = ref(false);
const isMetamaskConnected = ref(false);
const isMetamaskSnapInstalled = ref(false);
const isVerifyingWallet = ref(true);

const parseMetamaskPublicKeys = async () => {
  const toastToDismiss = toast.loading('Metamask detected. Parsing public keys...');

  try {
    isLoading.value = true;

    try {
      await metamaskStore.connect(0);
      isMetamaskConnected.value = metamaskStore.isConnected;
    } catch {
      toast.error('Metamask is not installed or not connected');
      return;
    }

    publicKeys.value = await metamaskStore.metamask!.getPublicKeys('owner', 'active', 'posting', 'memo');
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled();

    toast.success('Successfully parsed Metamask public keys');
  } catch (error) {
    toastError('Failed to parse Metamask public keys', error);
    throw error;
  } finally {
    isLoading.value = false;
    toast.dismiss(toastToDismiss);
  }
};

const connectMetamask = async () => {
  isLoading.value = true;
  try {
    await metamaskStore.connect(0);
    isMetamaskConnected.value = metamaskStore.isConnected;
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled();

    if (isMetamaskSnapInstalled.value)
      await parseMetamaskPublicKeys();

  } catch (error) {
    toastError('Failed to connect to Metamask', error);
  } finally {
    isLoading.value = false;
  }
};

const installMetamaskSnap = async () => {
  isLoading.value = true;
  try {
    await metamaskStore.install();
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled();

    if (isMetamaskSnapInstalled.value)
      await parseMetamaskPublicKeys();

  } catch (error) {
    toastError('Failed to install Metamask Snap', error);
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

    if (isMetamaskInstalled && metamaskStore.isInstalled())
      void parseMetamaskPublicKeys();

  } catch {
    isVerifyingWallet.value = false;
  }

  const stopWatcher = watch(
    () => walletStore.walletsStatus.metamask,
    (isMetamaskDetected) => {
      if (isMetamaskDetected && metamaskStore.isInstalled())
        void parseMetamaskPublicKeys();

    }
  );

  onBeforeUnmount(() => {
    stopWatcher();
  });
});
</script>

<template>
  <Card class="w-full max-w-[600px]">
    <CardHeader>
      <CardTitle class="inline-flex items-center justify-between">
        <div class="flex items-center">
          <img
            v-if="hasMetamaskWithSnap"
            :src="getWalletIcon(UsedWallet.METAMASK)"
            class="w-[20px] mr-2"
          >
          <span class="ml-1">MetaMask integrated onboarding</span>
        </div>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: hsla(var(--foreground) / 80%)"
            :d="mdiAccountPlusOutline"
          />
        </svg>
      </CardTitle>
      <CardDescription class="mr-8 ml-1">
        <HiveFriendHelpTooltip>
          <template #default>
            <span class="text-left">
              Connect your wallet and fill in the form below to prepare an account creation link shared with your Hive friend.
              <svg
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="inline-block align-text-bottom"
              >
                <path
                  style="fill: currentColor"
                  :d="mdiHelpCircleOutline"
                />
              </svg>
            </span>
          </template>
        </HiveFriendHelpTooltip>
      </CardDescription>
    </CardHeader>
    <CardContent class="text-sm">
      <div
        v-if="!isMetamaskConnected"
        class="space-y-4"
      >
        <p>Step 1: Connect your Metamask wallet:</p>
        <div class="flex justify-center">
          <Button
            :disabled="!walletStore.walletsStatus.metamask || isLoading"
            variant="outline"
            size="lg"
            class="px-8 py-4 border-[#FF5C16] border-[2px]"
            @click="connectMetamask"
          >
            <img
              :src="getWalletIcon(UsedWallet.METAMASK)"
              class="w-[20px] mr-2"
            >
            <span class="text-md font-bold">Connect Metamask</span>
          </Button>
        </div>
        <Alert
          v-if="isVerifyingWallet"
          variant="loading"
          role="loader"
        >
          <AlertTitle>
            Verifying wallet installation...
          </AlertTitle>
          <AlertDescription>Checking if Metamask extension is installed.</AlertDescription>
        </Alert>
        <Alert
          v-else-if="!walletStore.walletsStatus.metamask"
          variant="warning"
        >
          <AlertTitle>
            Metamask not detected
          </AlertTitle>
          <AlertDescription>
            Please install
            <a
              href="https://docs.metamask.io/snaps/get-started/install-flask/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-orange-500 hover:underline"
            >
              MetaMask extension
            </a>
            to continue with wallet-based account creation.
          </AlertDescription>
        </Alert>
      </div>
      <div
        v-else-if="isMetamaskConnected && !isMetamaskSnapInstalled"
        class="space-y-4"
      >
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
      <div
        v-else-if="hasMetamaskWithSnap"
        class="space-y-4"
      >
        <p class="mb-4">
          Step 3: Request account creation
        </p>
        <AccountNameInput
          id="wallet_account_name"
          v-model="createAccountNameOperation"
          label="New account name"
          placeholder="Enter desired account name"
          @validation-change="onAccountNameValidationChange"
        />
        <div class="border p-4 rounded-md">
          <div class="flex items-start">
            <svg
              width="16"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="mr-2 mt-0.5 flex-shrink-0"
            >
              <path
                style="fill: currentColor"
                :d="mdiShieldCheckOutline"
              />
            </svg>
            <div class="text-sm">
              <p class="font-bold mb-1">
                Secure Key Generation
              </p>
              <p>
                Secret part of authority data specified for your new Hive account has been generated from your Secure Recovery Phrase and saved by MetaMask wallet.
              </p>
            </div>
          </div>
        </div>
        <ExpandablePanel :public-keys="publicKeys" />
        <AccountCreationActionButtons
          :create-account-name-operation="createAccountNameOperation"
          :public-keys="publicKeys"
          :buttons-disabled="!accountNameValid"
          :show-tooltip="false"
        />
      </div>
      <div
        v-if="isLoading"
        class="flex items-center justify-center py-8"
      >
        <div class="flex items-center space-x-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span class="text-sm">Processing...</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
