<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';

import HTMLoginContent from '@/components/htm/HTMLoginContent.vue';
import HTMProvidePasswordContent from '@/components/htm/HTMProvidePasswordContent.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsedWallet, getWalletIcon, useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { canAutoLogin, performAutoLogin } from '@/utils/auto-login';
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

const isCheckingWalletStatus = ref(true);
const isAutoLoginAvailable = ref(false);

const tokensStore = useTokensStore();

const hasStoredHTMWallet = ref(false);
const mode = ref<'login' | 'create'>('create');

const close = () => {
  emit('close');
};

onMounted(async () => {
  try {
    const alreadyUnlocked = CTokensProvider.isLoggedIn();
    let walletExists = alreadyUnlocked;

    if (!walletExists)
      walletExists = await CTokensProvider.hasWallet();

    hasStoredHTMWallet.value = walletExists;
    mode.value = walletExists ? 'login' : 'create';

    // Check for auto-login availability
    isAutoLoginAvailable.value = await canAutoLogin();

    // If auto-login is available, try it automatically
    if (isAutoLoginAvailable.value) {
      const success = await performAutoLogin();
      if (success) {
        const operationalKey = tokensStore.getUserPublicKey();
        if (operationalKey) {
          await handleConditionalSiteLogin(operationalKey);
          emit('success');
          emit('setaccount', operationalKey);
        }
      }
    }
  } catch (error) {
    toastError('Failed to verify existing HTM wallet', error);
    hasStoredHTMWallet.value = false;
    mode.value = 'create';
  } finally {
    isCheckingWalletStatus.value = false;
  }
});

const switchToLoginMode = () => {
  if (!hasStoredHTMWallet.value)
    return;

  mode.value = 'login';
};

const handleConditionalSiteLogin = async (operationalKey: string) => {
  const wax = await getWax();

  if (walletStore.wallet !== undefined && !walletStore.isL2Wallet) {
    // Already logged in using L1 wallet, so just add another layer on top of that
    await tokensStore.reset(await CTokensProvider.for(wax, 'posting'));

    return;
  }

  // Not logged in using any wallet so allow user log in using HTM wallet

  // Set settings with the operational key as account and CTOKENS wallet
  settingsStore.setSettings({
    account: operationalKey,
    wallet: UsedWallet.CTOKENS_IMPLEMENTATION
  });

  // Create wallet provider and parse user data
  await walletStore.createWalletFor(settingsStore.settings, 'posting');
  await userStore.parseUserData(operationalKey);
};

// Handle account creation from HTMLoginContent
const handleSetAccount = async (account: string) => {
  try {
    toast.success('HTM wallet created successfully!');
    hasStoredHTMWallet.value = true;
    switchToLoginMode();
    emit('success');
    emit('setaccount', account);
  } catch (error) {
    toastError('Failed to setup HTM wallet', error);
  }
};

// Handle successful login from HTMProvidePasswordContent
const handleLoginSuccess = async () => {
  try {
    // Get operational key after successful login
    const operationalKey = tokensStore.getUserPublicKey();
    if (!operationalKey)
      throw new Error('Failed to get operational key after login');

    await handleConditionalSiteLogin(operationalKey);

    emit('success');
    emit('setaccount', operationalKey);
  } catch (error) {
    toastError('Failed to setup HTM wallet after login', error);
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
      <!-- Auto-login in progress message -->
      <div
        v-if="isCheckingWalletStatus && isAutoLoginAvailable"
        class="text-center space-y-2 py-4"
      >
        <div class="animate-spin mx-auto h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p class="text-sm text-muted-foreground">
          Automatically logging you in...
        </p>
      </div>

      <div
        v-else-if="isCheckingWalletStatus"
        class="text-sm text-muted-foreground text-center py-6"
      >
        Checking for existing HTM wallet...
      </div>

      <div
        v-else-if="mode === 'login'"
        class="space-y-4"
      >
        <HTMProvidePasswordContent
          :embed="true"
          @success="handleLoginSuccess"
        />
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <HTMLoginContent
          :show-steps="false"
          @setaccount="handleSetAccount"
        />

        <Button
          v-if="hasStoredHTMWallet"
          variant="link"
          class="w-full justify-center text-sm"
          @click="switchToLoginMode"
        >
          Use my existing HTM wallet
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
