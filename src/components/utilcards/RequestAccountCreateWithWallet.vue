<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mdiAccountPlusOutline } from '@mdi/js';
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { toastError } from '@/utils/parse-error';
import { getWax } from '@/stores/wax.store';
import { useWalletStore } from '@/stores/wallet.store';
import { useMetamaskStore } from '@/stores/metamask.store';
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
    } catch {
      toast.error("Metamask is not installed or not connected");

      return;
    }

    publicKeys.value = await metamaskStore.metamask!.getPublicKeys("owner", "active", "posting", "memo");

    toast.success("Successfully parsed Metamask public keys");
  } catch (error) {
    toastError("Failed to parse Metamask public keys", error);

    throw error; // Make sure this method throws to handle sonner toast properly
  } finally {
    isLoading.value = false;

    toast.dismiss(toastToDismiss);
  }
};

const hasMetamaskWithSnap = computed(() => walletStore.walletsStatus.metamask && metamaskStore.isInstalled);

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
      <CardTitle class="inline-flex items-center justify-between">
        <span>Request Account Creation</span>
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsla(var(--foreground) / 80%)" :d="mdiAccountPlusOutline"/></svg>
      </CardTitle>
      <CardDescription class="mr-8">Fill in this form in order to prepare the operation to request account creation</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4" v-if="hasMetamaskWithSnap">
        <div class="grid mb-2 w-full items-center gap-1.5">
          <Label for="metamask_createAuth_account_card">New account name</Label>
          <Input class="w-full" v-model="createAccountNameOperation!" @update:model-value="validateAccountName()" id="metamask_createAuth_account_card" />
          <span class="text-red-400" v-if="createAccountNameOperation && !accountNameValid">Invalid account name</span>
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
        <Button :copy="getAccountCreateSigningLink" :disabled="isLoading || !createAccountNameOperation || !accountNameValid">
          <span class="text-md font-bold">Copy signing link</span>
        </Button>
        <p v-if="hasCopiedCreateSignLink">
          Now send this link to someone who has an account to execute this operation in blockchain
        </p>
      </div>
      <div v-else class="space-y-4">
        <div class="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4" role="alert">
          <p class="font-bold">Wallet required</p>
          <p>You have to connect to Metamask wallet before continuing!</p>
        </div>
        <Button @click="walletStore.openWalletSelectModal()" class="w-full font-bold">
          Connect to Metamask wallet
        </Button>
      </div>
    </CardContent>
  </Card>
</template>