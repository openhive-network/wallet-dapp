<script setup lang="ts">
import { mdiLogout } from '@mdi/js';
import { computed } from 'vue';

import ToggleSidebar from '@/components/navigation/ToggleSidebar.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ThemeSwitch from '@/components/ui/theme-switch';
import { useSettingsStore, getWalletIcon } from '@/stores/settings.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useUserStore } from '@/stores/user.store';
import { useWalletStore } from '@/stores/wallet.store';

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);
const walletStore = useWalletStore();
const userStore = useUserStore();
const tokensStore = useTokensStore();

const logout = () => {
  settingsStore.resetSettings();
  walletStore.resetWallet();
  userStore.resetSettings();
  tokensStore.reset();
};
</script>

<template>
  <header class="w-full h-[60px] bg-background">
    <div class="fixed top-0 z-10 bg-background/60 backdrop-blur-sm px-4 h-[60px] border-b w-full md:w-[calc(100%-var(--sidebar-width))] flex items-center justify-between">
      <ToggleSidebar />
      <div
        v-if="settingsStore.isLoaded && hasUser"
        class="ml-2 inline-flex items-center"
      >
        <Avatar class="w-8 h-8 mr-2 border">
          <AvatarImage
            v-if="userStore.profileImage"
            :src="userStore.profileImage"
          />
          <AvatarFallback v-if="settingsStore.isLoaded && hasUser">
            {{ userStore.userDisplayName?.slice(1, 3) }}
          </AvatarFallback>
        </Avatar>
        <span
          v-if="settingsStore.isLoaded && hasUser"
          class="font-bold max-w-[150px] md:max-w-full truncate"
        >{{ userStore.userDisplayName }}</span>
      </div>
      <div class="ml-auto inline-flex items-center space-x-4 md:space-x-6">
        <ThemeSwitch class="w-6 h-6" />
        <Button
          variant="outline"
          class="[&_svg]:size-6 px-2 md:px-4 font-bold"
          @click="settingsStore.isLoaded && hasUser ? logout() : walletStore.openWalletSelectModal()"
        >
          <img
            v-if="hasUser"
            :src="getWalletIcon(settingsStore.settings.wallet!)"
            class="h-6 w-6"
          >
          <span v-if="settingsStore.isLoaded && hasUser">
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
  </header>
</template>
