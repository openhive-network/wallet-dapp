<script setup lang="ts">
import { ref } from 'vue';
import { toast } from 'vue-sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsedWallet, useSettingsStore } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const props = defineProps({
  embed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['success']);

const router = useRouter();
const walletStore = useWalletStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();
const tokensStore = useTokensStore();

const isLoading = ref(false);

const password = ref('');

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
          account: CTokensProvider.getOperationalPublicKey(),
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

const openRegistration = () => {
  close();
  router.push('/tokens/register-account');
};
</script>

<template>
  <div class="space-y-4">
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
        variant="outline"
        size="lg"
        :class="props.embed ? 'w-full' : 'px-8 py-4 border-[2px] border-[#FBA510]'"
        @click="connect"
      >
        <span class="text-md font-bold">Connect</span>
      </Button>
    </div>
    <Button
      v-if="!props.embed"
      variant="link"
      class="w-full justify-center text-sm"
      @click="openRegistration"
    >
      Create a new HTM wallet instead
    </Button>
  </div>
</template>
