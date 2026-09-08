<script setup lang="ts">
import { mdiLockOutline, mdiShieldCheckOutline } from '@mdi/js';
import { computed } from 'vue';


import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getWalletIcon, UsedWallet } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';

import type { AccountRegistrationMethod } from '#shared/types/account-request';

const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';


const props = defineProps<{
  /** Method with an expanded inline form (password) */
  selected?: AccountRegistrationMethod;
  /** Method whose pre-checks are running - shown as loading */
  pendingMethod?: AccountRegistrationMethod;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [method: AccountRegistrationMethod];
}>();

const walletStore = useWalletStore();

const isMetamaskDetected = computed(() => walletStore.walletsStatus.metamask);
const isBusy = computed(() => !!props.pendingMethod);

const walletMethods = computed(() => [
  {
    method: 'google' as const,
    label: 'Register with Google',
    description: 'Keys stay encrypted in your own Google Drive',
    icon: getWalletIcon(UsedWallet.GOOGLE_DRIVE),
    testId: 'create-account-method-google',
    available: true,
    desktopOnly: false
  },
  {
    method: 'metamask' as const,
    label: 'Register with MetaMask',
    description: isMetamaskDetected.value
      ? 'Desktop only - keys derived by the Hive snap in the extension'
      : 'Desktop only - needs the MetaMask extension with the Hive snap',
    icon: getWalletIcon(UsedWallet.METAMASK),
    testId: 'create-account-method-metamask',
    available: isMetamaskDetected.value,
    desktopOnly: true
  }
]);

const buttonClass = 'h-auto w-full min-w-0 py-4 px-4 justify-start sm:justify-center whitespace-normal text-left';
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
      <Button
        v-for="option in walletMethods"
        :key="option.method"
        :data-testid="option.testId"
        type="button"
        variant="outline"
        :disabled="disabled || isBusy || !option.available"
        :loading="pendingMethod === option.method"
        :class="[buttonClass, { 'hidden sm:inline-flex': option.desktopOnly }]"
        @click="emit('select', option.method)"
      >
        <img
          :src="option.icon"
          :alt="option.label"
          class="w-[28px] mr-3 shrink-0"
        >
        <span class="flex flex-col items-start min-w-0">
          <span class="font-semibold">{{ option.label }}</span>
          <span class="text-xs text-muted-foreground font-normal">{{ option.description }}</span>
        </span>
      </Button>
    </div>
    <div
      data-testid="create-account-google-safety"
      class="border rounded-md p-4"
    >
      <div class="flex items-start">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="!size-4 mr-2 mt-0.5 shrink-0"
        >
          <path
            style="fill: hsl(var(--primary))"
            :d="mdiShieldCheckOutline"
          />
        </svg>
        <div class="text-sm space-y-1">
          <p class="font-bold">
            Google is only a vault for your keys - your privacy stays yours
          </p>
          <p class="text-muted-foreground">
            Signing in with Google does not sign you up for anything: no newsletters, no spam, no data shared with anyone.
            We don't keep your e-mail address and your Hive account is never linked to your Google identity.
          </p>
          <p class="text-muted-foreground">
            Google only stores an encrypted file in a private folder of your own Drive - neither Google nor Hive Bridge can read your keys.
          </p>
        </div>
      </div>
    </div>
    <p
      v-if="!isMetamaskDetected"
      data-testid="create-account-metamask-note"
      class="hidden sm:block text-xs text-muted-foreground text-center"
    >
      MetaMask works on a computer only - the Hive snap runs inside the browser extension.
      <a
        :href="METAMASK_DOWNLOAD_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="underline hover:text-foreground keychainify-checked"
      >Install it</a>
      on desktop and reload this page.
    </p>
    <Separator label="Or" />
    <Button
      data-testid="create-account-method-password"
      type="button"
      variant="outline"
      :disabled="disabled || isBusy"
      :class="[buttonClass, { 'border-primary bg-primary/5': selected === 'password' }]"
      :aria-pressed="selected === 'password'"
      @click="emit('select', 'password')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="!size-7 mr-3 shrink-0"
      >
        <path
          style="fill: hsl(var(--primary))"
          :d="mdiLockOutline"
        />
      </svg>
      <span class="flex flex-col items-start min-w-0">
        <span class="font-semibold">Register with a password</span>
        <span class="text-xs text-muted-foreground font-normal">Keys derived from a master password you choose</span>
      </span>
    </Button>
    <p
      v-if="disabled"
      class="text-xs text-muted-foreground text-center"
    >
      Enter a valid account name to choose a registration method.
    </p>
  </div>
</template>
