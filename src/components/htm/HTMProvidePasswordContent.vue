<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';

import HTMLoginContent from '@/components/htm/HTMLoginContent.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsedWallet, useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { canAutoLogin, performAutoLogin } from '@/utils/auto-login';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const props = defineProps({
  embed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['success']);

const walletStore = useWalletStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();

const isLoading = ref(false);
const isAutoLoginAvailable = ref(false);

const password = ref('');
const mode = ref<'login' | 'create'>('login');

const switchToCreateMode = () => {
  mode.value = 'create';
};

const switchToLoginMode = () => {
  mode.value = 'login';
};

// Check for auto-login on mount
onMounted(async () => {
  isAutoLoginAvailable.value = await canAutoLogin();

  // If auto-login is available, try it automatically
  if (isAutoLoginAvailable.value) {
    isLoading.value = true;
    const success = await performAutoLogin();
    isLoading.value = false;

    if (success) {
      emit('success');
      // Close the modal since auto-login succeeded
      walletStore.isProvideWalletPasswordModalOpen = false;
    }
  }
});

const connect = async () => {
  try {
    isLoading.value = true;

    const wax = await getWax();

    await CTokensProvider.login(password.value);

    try {
      if (walletStore.hasWallet) {
        const ctokensWallet = await CTokensProvider.for(wax, 'posting');

        await tokensStore.reset(ctokensWallet);
      } else {
        await walletStore.createWalletFor({
          account: tokensStore.getUserPublicKey(),
          wallet: UsedWallet.CTOKENS_IMPLEMENTATION
        }, 'posting');
        if (settingsStore.settings?.account)
          await userStore.parseUserData(settingsStore.settings.account);
      }

      toast.success('Logged in successfully!');
      emit('success');
    } catch (error) {
      toastError('Failed to create wallet', error);
    }
  } catch (error) {
    toastError('Failed to connect to HTM', error);
  } finally {
    isLoading.value = false;
  }
};

const handleCreateAccount = async () => {
  // Close the modal as the user is creating a new HTM wallet
  walletStore.isProvideWalletPasswordModalOpen = false;
  emit('success');
};
</script>

<template>
  <div class="space-y-4">
    <!-- Auto-login in progress message -->
    <div
      v-if="isLoading && isAutoLoginAvailable"
      class="text-center space-y-2 py-4"
    >
      <div class="animate-spin mx-auto h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      <p class="text-sm text-muted-foreground">
        Automatically logging you in...
      </p>
    </div>

    <div
      v-else-if="mode === 'login'"
      class="space-y-4"
    >
      <p>Provide your HTM wallet password:</p>

      <div class="space-y-2">
        <div class="space-y-1">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter a password to encrypt the wallet"
          />
        </div>
      </div>

      <div class="flex justify-center">
        <Button
          :disabled="isLoading"
          :variant="props.embed ? 'default' : 'outline'"
          :size="props.embed ? 'default' : 'lg'"
          :class="props.embed ? 'w-full' : 'px-8 py-4 border-[2px] border-[#FBA510]'"
          @click="connect"
        >
          <span v-if="isLoading">Logging in...</span>
          <span v-else-if="props.embed">Login to HTM</span>
          <span v-else class="text-md font-bold">Connect</span>
        </Button>
      </div>

      <Button
        variant="link"
        class="w-full justify-center text-sm"
        @click="switchToCreateMode"
      >
        Create a new HTM wallet instead
      </Button>
    </div>

    <div
      v-else
      class="space-y-4"
    >
      <HTMLoginContent
        :show-steps="false"
        @setaccount="handleCreateAccount"
      />

      <Button
        variant="link"
        class="w-full justify-center text-sm"
        @click="switchToLoginMode"
      >
        Use my existing HTM wallet
      </Button>
    </div>
  </div>
</template>
