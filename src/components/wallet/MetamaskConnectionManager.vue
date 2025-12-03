<script setup lang="ts">
import type { TRole } from '@hiveio/wax';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';
import { computed, ref, onMounted, watch, readonly } from 'vue';
import { toast } from 'vue-sonner';

import { useMetamaskStore } from '@/stores/metamask.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';

const props = defineProps<{
  autoConnect?: boolean;
  showConnectErrors?: boolean;
}>();

const emit = defineEmits<{
  connected: [isConnected: boolean];
  snapInstalled: [isInstalled: boolean];
  publicKeysParsed: [publicKeys: Record<TRole, string>];
  statusChanged: [status: {
    isConnected: boolean;
    isSnapInstalled: boolean;
    isVerifying: boolean;
    isLoading: boolean;
  }];
}>();

const walletStore = useWalletStore();
const metamaskStore = useMetamaskStore();

const isLoading = ref(false);
const isMetamaskConnected = ref(false);
const isMetamaskSnapInstalled = ref(false);
const isVerifyingWallet = ref(true);

const publicKeys = ref<Record<TRole, string>>({
  owner: '',
  active: '',
  posting: '',
  memo: ''
});

const hasMetamaskWithSnap = computed(() =>
  walletStore.walletsStatus.metamask &&
  isMetamaskConnected.value &&
  isMetamaskSnapInstalled.value
);

const parseMetamaskPublicKeys = async () => {
  const toastToDismiss = toast.loading('Metamask detected. Parsing public keys...');

  try {
    isLoading.value = true;

    try {
      await metamaskStore.connect(0, 'posting');
      isMetamaskConnected.value = metamaskStore.isConnected;
    } catch {
      toastError('Metamask is not installed or not connected');
      return;
    }

    publicKeys.value = await metamaskStore.metamask!.getPublicKeys('owner', 'active', 'posting', 'memo');
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled();

    toast.success('Successfully parsed Metamask public keys');
    emit('publicKeysParsed', publicKeys.value);
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
    await metamaskStore.connect(0, 'posting');
    isMetamaskConnected.value = metamaskStore.isConnected;
    isMetamaskSnapInstalled.value = metamaskStore.isInstalled();

    emit('connected', isMetamaskConnected.value);

    if (isMetamaskSnapInstalled.value)
      await parseMetamaskPublicKeys();
  } catch (error) {
    if (props.showConnectErrors)
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

    emit('snapInstalled', isMetamaskSnapInstalled.value);

    if (isMetamaskSnapInstalled.value)
      await parseMetamaskPublicKeys();
  } catch (error) {
    toastError('Failed to install Metamask Snap', error);
  } finally {
    isLoading.value = false;
  }
};

const checkWalletStatus = async () => {
  try {
    const isMetamaskInstalled = await MetaMaskProvider.isExtensionInstalled();

    isVerifyingWallet.value = false;

    if (isMetamaskInstalled && metamaskStore.isInstalled()) {
      if (props.autoConnect)
        await parseMetamaskPublicKeys();
    }
  } catch {
    isVerifyingWallet.value = false;
  }
};

watch(
  [isMetamaskConnected, isMetamaskSnapInstalled, isVerifyingWallet, isLoading],
  () => {
    emit('statusChanged', {
      isConnected: isMetamaskConnected.value,
      isSnapInstalled: isMetamaskSnapInstalled.value,
      isVerifying: isVerifyingWallet.value,
      isLoading: isLoading.value
    });
  },
  { immediate: true }
);

watch(
  () => walletStore.walletsStatus.metamask,
  (isMetamaskDetected) => {
    if (isMetamaskDetected && metamaskStore.isInstalled() && props.autoConnect)
      void parseMetamaskPublicKeys();
  }
);

onMounted(async () => {
  await checkWalletStatus();
});

defineExpose({
  connectMetamask,
  installMetamaskSnap,
  parseMetamaskPublicKeys,
  checkWalletStatus,
  publicKeys: readonly(publicKeys),
  isConnected: readonly(isMetamaskConnected),
  isSnapInstalled: readonly(isMetamaskSnapInstalled),
  isVerifying: readonly(isVerifyingWallet),
  isLoading: readonly(isLoading),
  hasMetamaskWithSnap: readonly(hasMetamaskWithSnap)
});
</script>

<template>
  <slot
    :connect-metamask="connectMetamask"
    :install-metamask-snap="installMetamaskSnap"
    :parse-metamask-public-keys="parseMetamaskPublicKeys"
    :check-wallet-status="checkWalletStatus"
    :public-keys="publicKeys"
    :is-connected="isMetamaskConnected"
    :is-snap-installed="isMetamaskSnapInstalled"
    :is-verifying="isVerifyingWallet"
    :is-loading="isLoading"
    :has-metamask-with-snap="hasMetamaskWithSnap"
  />
</template>
