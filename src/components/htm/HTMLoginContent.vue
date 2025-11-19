<script setup lang="ts">
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, UsedWallet } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

interface Props {
  showSteps?: boolean;
}

withDefaults(defineProps<Props>(), {
  showSteps: true
});

const emit = defineEmits(['setaccount', 'close']);

const isLoading = ref(false);

const managementKey = ref('');
const operationalKey = ref('');
const password = ref('');
const repeatPassword = ref('');

const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const tokensStore = useTokensStore();

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

const connect = async () => {
  try {
    if (password.value !== repeatPassword.value) {
      toastError('Failed to connect to HTM', 'The provided passwords do not match');

      return;
    }

    isLoading.value = true;

    const { operational } = await CTokensProvider.createWallet(password.value, operationalKey.value, managementKey.value.length === 0 ? undefined : managementKey.value);

    const wax = await getWax();

    const users = await wax.restApi.ctokensApi.users({ user: operational });
    if (!users?.management_key) {
      toastError('Failed to connect to HTM', 'The provided operational key is not registered in HTM');

      return;
    }

    await CTokensProvider.login(password.value);

    await handleConditionalSiteLogin(operational);

    emit('setaccount', operational);
  } catch (error) {
    toastError('Failed to connect to HTM', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="text-sm space-y-4">
    <div class="space-y-4">
      <p v-if="showSteps">
        Step 1: Provide your login credentials:
      </p>
      <p
        v-else
        class="text-sm text-muted-foreground"
      >
        Connect your HTM wallet by providing your keys and setting a password:
      </p>

      <div>
        <div class="mb-1 space-y-1">
          <Label for="operationalKey">Operational Private Key</Label>
          <Input
            id="operationalKey"
            v-model="operationalKey"
            type="text"
            placeholder="Enter your operational key"
          />
        </div>
        <div class="mb-5 space-y-1">
          <Label for="managementKey">Management Private Key (optional)</Label>
          <Input
            id="managementKey"
            v-model="managementKey"
            type="text"
            placeholder="Enter your management key"
          />
        </div>
        <Separator />
        <div class="mt-3 mb-1 space-y-1">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter a password to encrypt the wallet"
          />
        </div>
        <div class="space-y-1">
          <Label for="repeatPassword">Repeat Password</Label>
          <Input
            id="repeatPassword"
            v-model="repeatPassword"
            type="password"
            placeholder="Repeat the password"
          />
        </div>
      </div>

      <div v-if="showSteps">
        <p>Step 2: Click this button to verify your configuration and connect to the wallet:</p>
        <div class="flex justify-center mt-4">
          <Button
            :disabled="isLoading"
            variant="outline"
            size="lg"
            class="px-8 py-4 border-[#FBA510] border-[2px]"
            @click="connect"
          >
            <span class="text-md font-bold">Connect</span>
          </Button>
        </div>
      </div>
      <div v-else>
        <Button
          :disabled="isLoading || !operationalKey || !password || !repeatPassword"
          class="w-full"
          @click="connect"
        >
          <span v-if="isLoading">Creating Wallet...</span>
          <span v-else>Import to HTM Wallet</span>
        </Button>
      </div>
    </div>
  </div>
</template>
