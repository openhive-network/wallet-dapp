<script setup lang="ts">
import { mdiLogout } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';

import cTokensLogoUrl from '@/assets/icons/wallets/ctokens.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTokensStore } from '@/stores/tokens.store';
import { useWalletStore } from '@/stores/wallet.store';
import { toastError } from '@/utils/parse-error';
import CTokensProvider from '@/utils/wallet/ctokens/signer';

const tokensStore = useTokensStore();
const walletStore = useWalletStore();

const userMetadata = ref<{
  displayName: string;
  about?: string;
  name?: string;
  profileImage?: string;
  website?: string;
} | undefined>(undefined);

const hasUser = computed(() => tokensStore.wallet !== undefined && userMetadata.value !== undefined);

const hasTokenWallet = computed(() => tokensStore.wallet !== undefined);

watch(hasTokenWallet, (hasTokenWallet) => {
  if (hasTokenWallet)
    void refetchUserData();
  else
    userMetadata.value = undefined;

});

const refetchUserData = async () => {
  try {
    userMetadata.value = await tokensStore.getCurrentUserMetadata();
  } catch (error) {
    toastError('Error fetching HTM user data', error);
  }
};

const logout = async () => {
  try {
    await tokensStore.reset();
    userMetadata.value = undefined;
  } catch (error) {
    toastError('Failed to logout', error);
  }
};
const goToLoginPage = () => {
  walletStore.isProvideWalletPasswordModalOpen = true;
};
onMounted(async () => {
  try {
    if (await CTokensProvider.hasWallet() && CTokensProvider.isLoggedIn() && tokensStore.wallet !== undefined)
      void refetchUserData();
    else if (!tokensStore.ignoreLogIn)
      walletStore.isProvideWalletPasswordModalOpen = true;
  } catch (error){
    toastError('Error checking cTokens wallet', error);
  }
});
</script>

<template>
  <div class="w-full flex flex-row gap-2 justify-between">
    <div
      v-if="hasUser"
      class="ml-2 inline-flex items-center relative"
    >
      <Avatar class="w-8 h-8 mr-2 border">
        <AvatarImage
          v-if="userMetadata!.profileImage"
          :src="userMetadata!.profileImage"
        />
        <AvatarFallback>
          {{ userMetadata!.displayName?.slice(0, 2) }}
        </AvatarFallback>
      </Avatar>
      <img
        :src="cTokensLogoUrl"
        class="h-[16px] w-[16px] absolute top-5 left-5 rounded-full border bg-background"
      >
      <span
        class="font-bold max-w-[150px] md:max-w-full truncate"
      >{{ userMetadata!.displayName }}</span>
    </div>
    <div class="ml-auto inline-flex items-center space-x-4 md:space-x-6">
      <Button
        variant="outline"
        class="[&_svg]:size-6 px-2 md:px-4 font-bold"
        @click="hasUser ? logout() : goToLoginPage()"
      >
        <img
          v-if="hasUser"
          :src="cTokensLogoUrl"
          class="h-6 w-6"
        >
        <span v-if="hasUser">
          <span class="hidden md:inline">Disconnect</span>
          <svg
            class="inline md:hidden"
            width="24"
            height="24"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path
              style="fill: hsl(var(--foreground))"
              :d="mdiLogout"
            />
          </svg>
        </span>
        <span v-else>Connect</span>
      </Button>
    </div>
  </div>
</template>
