<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';

import HTMLoginContent from '@/components/HTMLoginContent.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsedWallet, getWalletIcon, useSettingsStore } from '@/stores/settings.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

interface Props {
  showCloseButton?: boolean;
  title?: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  showCloseButton: false,
  title: 'HTM Login',
  description: 'Login to your Hive Token Machine account'
});

const emit = defineEmits(['success', 'close', 'setaccount']);

const walletStore = useWalletStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

const isLoading = ref(false);

// Existing account login
const password = ref('');

// Check if user already has HTM wallet configured (only needs password)
const hasHTMWallet = computed(() => CTokensProvider.isLoggedIn());

const close = () => {
  emit('close');
};

// Handle account creation from HTMLoginContent
const handleSetAccount = async (account: string) => {
  try {
    // Set settings with the operational key as account and CTOKENS wallet
    await settingsStore.setSettings({
      account: account,
      wallet: UsedWallet.CTOKENS_IMPLEMENTATION
    });

    // Create wallet provider and parse user data
    await walletStore.createWalletFor(settingsStore.settings, 'posting');
    await userStore.parseUserData(account);

    toast.success('HTM wallet created successfully!');
    emit('success');
    emit('setaccount', account);
  } catch (error) {
    toastError('Failed to setup HTM wallet', error);
  }
};

// Login to existing HTM account
const loginExisting = async () => {
  try {
    isLoading.value = true;

    await CTokensProvider.login(password.value);

    // Get operational key after successful login
    const operationalKey = CTokensProvider.getOperationalPublicKey();
    if (!operationalKey)
      throw new Error('Failed to get operational key after login');

    // Set settings with the operational key as account and CTOKENS wallet
    await settingsStore.setSettings({
      account: operationalKey,
      wallet: UsedWallet.CTOKENS_IMPLEMENTATION
    });

    // Create wallet provider and parse user data
    await walletStore.createWalletFor(settingsStore.settings, 'posting');
    await userStore.parseUserData(operationalKey);

    toast.success('Logged in successfully!');
    emit('success');
    emit('setaccount', operationalKey);
  } catch (error) {
    toastError('Failed to connect to HTM', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>
        <div class="inline-flex justify-between w-full">
          <div class="inline-flex items-center">
            <img
              :src="getWalletIcon(UsedWallet.CTOKENS_IMPLEMENTATION)"
              class="w-[20px] mr-2"
            >
            <span class="mt-[2px]">{{ title }}</span>
          </div>
          <Button
            v-if="showCloseButton"
            variant="ghost"
            size="sm"
            class="px-2"
            @click="close"
          >
            <svg
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                style="fill: hsl(var(--foreground))"
                :d="mdiClose"
              />
            </svg>
          </Button>
        </div>
      </CardTitle>
      <CardDescription>{{ description }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Simple password login for existing HTM wallet -->
      <div
        v-if="hasHTMWallet"
        class="space-y-4"
      >
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">
            Enter your HTM wallet password:
          </p>

          <div class="space-y-1">
            <Label for="wallet-password">Password</Label>
            <Input
              id="wallet-password"
              v-model="password"
              type="password"
              placeholder="Enter your HTM wallet password"
              @keyup.enter="loginExisting"
            />
          </div>
        </div>

        <Button
          :disabled="isLoading || !password"
          class="w-full"
          @click="loginExisting"
        >
          <span v-if="isLoading">Logging in...</span>
          <span v-else>Login to HTM</span>
        </Button>
      </div>

      <!-- Wallet creation form for new users -->
      <div
        v-else
        class="space-y-4"
      >
        <HTMLoginContent
          :show-steps="false"
          @setaccount="handleSetAccount"
        />
      </div>
    </CardContent>
  </Card>
</template>
