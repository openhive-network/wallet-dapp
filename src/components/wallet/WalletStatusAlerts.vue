<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWalletStore } from '@/stores/wallet.store';

const props = defineProps<{
  isVerifying: boolean;
  walletName?: string;
  installUrl?: string;
}>();

const walletStore = useWalletStore();

const defaultWalletName = props.walletName || 'Metamask';
const defaultInstallUrl = props.installUrl || 'https://metamask.io/download/';
</script>

<template>
  <div class="space-y-4">
    <Alert
      v-if="isVerifying"
      variant="loading"
      role="loader"
    >
      <AlertTitle>
        Verifying wallet installation...
      </AlertTitle>
      <AlertDescription>Checking if {{ defaultWalletName }} extension is installed.</AlertDescription>
    </Alert>
    <Alert
      v-else-if="!walletStore.walletsStatus.metamask"
      variant="warning"
    >
      <AlertTitle>
        {{ defaultWalletName }} not detected
      </AlertTitle>
      <AlertDescription>
        Please install
        <a
          :href="defaultInstallUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-orange-500 hover:underline"
        >
          {{ defaultWalletName }} extension
        </a>
        to continue with wallet-based account creation.
      </AlertDescription>
    </Alert>
  </div>
</template>
