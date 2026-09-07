<script setup lang="ts">
import { mdiDownload, mdiHomeOutline, mdiPartyPopper } from '@mdi/js';
import { computed } from 'vue';


import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Button as CopyButton } from '@/components/ui/copybutton';
import AccountDetailsExpandablePanel from '@/components/utilcards/AccountDetailsExpandablePanel.vue';
import type { CreatedAccount } from '@/composables/useAccountCreationFlow';
import { useSettingsStore } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';
import { downloadAuthorityDataFile } from '@/utils/account-request/authority-data';
import type { AccountAuthorityData } from '@/utils/account-request/keys';

const props = defineProps<{
  account: CreatedAccount;
  /** Private key material - available only right after the keys were generated on this page, not after a reload */
  authorityData?: AccountAuthorityData;
}>();

const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const isLoggedIn = computed(() => walletStore.hasWallet && settingsStore.account === props.account.accountName);

const methodNote = computed(() => {
  switch (props.account.method) {
  case 'google':
    return 'Your keys are stored encrypted in your Google Drive wallet. Keep the recovery password safe - it is required to unlock the wallet on other devices.';
  case 'metamask':
    return 'Your keys live in MetaMask. Connect MetaMask with the Hive snap on any device to use this account.';
  default:
    return `${props.authorityData ? 'Your authority data file has been downloaded automatically' : 'Your authority data file was downloaded when the account was created'} - keep it in a safe place and never share your master password, as all account keys derive from it.`;
  }
});

const download = () => {
  if (props.authorityData)
    downloadAuthorityDataFile(props.account.accountName, props.authorityData);
};
</script>

<template>
  <div
    data-testid="create-account-success"
    class="space-y-5"
  >
    <div class="flex flex-col items-center text-center space-y-2">
      <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          width="32"
          height="32"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: rgb(34 197 94)"
            :d="mdiPartyPopper"
          />
        </svg>
      </div>
      <h2 class="text-xl font-bold">
        Welcome to Hive, <span data-testid="create-account-success-name">@{{ account.accountName }}</span>!
      </h2>
      <p class="text-sm text-muted-foreground">
        Your account creation was broadcast and will be visible on the blockchain within a minute.
      </p>
    </div>
    <Alert
      v-if="isLoggedIn"
      variant="success"
    >
      <AlertTitle>You are signed in</AlertTitle>
      <AlertDescription>Hive Bridge is now connected to your new account.</AlertDescription>
    </Alert>
    <Alert variant="info">
      <AlertDescription>{{ methodNote }}</AlertDescription>
    </Alert>
    <div class="flex items-center justify-between text-xs text-muted-foreground border rounded-lg px-3 py-2">
      <span class="font-semibold uppercase">Transaction</span>
      <span class="flex items-center font-mono">
        <span class="truncate max-w-[140px] sm:max-w-none">{{ account.transactionId }}</span>
        <CopyButton :value="account.transactionId" />
      </span>
    </div>
    <AccountDetailsExpandablePanel :public-keys="account.publicKeys" />
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Button
        v-if="authorityData"
        data-testid="create-account-download-authority"
        variant="outline"
        class="w-full"
        @click="download"
      >
        <svg
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="mr-2"
        >
          <path
            style="fill: currentColor"
            :d="mdiDownload"
          />
        </svg>
        Download authority data
      </Button>
      <NuxtLink
        to="/"
        class="w-full keychainify-checked"
        :class="{ 'sm:col-span-2': !authorityData }"
      >
        <Button class="w-full">
          <svg
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="mr-2"
          >
            <path
              style="fill: currentColor"
              :d="mdiHomeOutline"
            />
          </svg>
          Go to Hive Bridge
        </Button>
      </NuxtLink>
    </div>
  </div>
</template>
