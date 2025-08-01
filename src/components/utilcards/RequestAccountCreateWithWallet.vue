<script setup lang="ts">
import type { TRole } from '@hiveio/wax/vite';
import { mdiAccountPlusOutline, mdiHelpCircleOutline, mdiShieldCheckOutline } from '@mdi/js';
import { computed, ref } from 'vue';

import AccountNameInput from '@/components/ui/AccountNameInput.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import HiveFriendHelpTooltip from '@/components/ui/HiveFriendHelpTooltip.vue';
import ExpandablePanel from '@/components/utilcards/ExpandablePanel.vue';
import { MetamaskConnectionManager, MetamaskConnectButton, WalletStatusAlerts, WalletLoadingIndicator } from '@/components/wallet';
import { getWalletIcon, UsedWallet } from '@/stores/settings.store';

import AccountCreationActionButtons from '../ui/AccountCreationActionButtons.vue';

const accountNameValid = ref(false);
const createAccountNameOperation = ref('');

// Handle account name validation from the component
const onAccountNameValidationChange = (isValid: boolean) => {
  accountNameValid.value = isValid;
};

// State management for connection manager
const publicKeys = ref<Record<TRole, string>>({
  owner: '',
  active: '',
  posting: '',
  memo: ''
});

const connectionStatus = ref({
  isConnected: false,
  isSnapInstalled: false,
  isVerifying: true,
  isLoading: false
});

const hasMetamaskWithSnap = computed(() =>
  connectionStatus.value.isConnected &&
  connectionStatus.value.isSnapInstalled
);

// Handle events from MetamaskConnectionManager
const handlePublicKeysParsed = (keys: Record<TRole, string>) => {
  publicKeys.value = keys;
};

const handleStatusChanged = (status: typeof connectionStatus.value) => {
  connectionStatus.value = status;
};
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
      <MetamaskConnectionManager
        :auto-connect="true"
        :show-connect-errors="true"
        @public-keys-parsed="handlePublicKeysParsed"
        @status-changed="handleStatusChanged"
      >
        <template #default="{ connectMetamask, installMetamaskSnap, isConnected, isSnapInstalled, isVerifying, isLoading }">
          <div
            v-if="!isConnected"
            class="space-y-4"
          >
            <p>Step 1: Connect your Metamask wallet:</p>
            <div class="flex justify-center">
              <MetamaskConnectButton
                :loading="isLoading"
                @click="connectMetamask"
              />
            </div>
            <WalletStatusAlerts :is-verifying="isVerifying" />
          </div>
          <div
            v-else-if="isConnected && !isSnapInstalled"
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
          <WalletLoadingIndicator :is-loading="isLoading" />
        </template>
      </MetamaskConnectionManager>
    </CardContent>
  </Card>
</template>
