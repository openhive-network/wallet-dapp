<script setup lang="ts">
import ToggleSidebar from '@/components/sidebar/ToggleSidebar.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button';
import { useWalletStore } from "@/stores/wallet.store";
import { useSettingsStore, getWalletIcon } from '@/stores/settings.store';
import ThemeSwitch from "@/components/ui/theme-switch";
import { computed } from 'vue';
import { useUserStore } from '@/stores/user.store';
import { mdiLogout } from '@mdi/js';

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);

const logout = () => {
  settingsStore.resetSettings();
  window.location.reload();
};

const walletStore = useWalletStore();

const userStore = useUserStore();
</script>

<template>
  <header class="w-full h-[60px] bg-background">
    <div class="fixed top-0 z-10 bg-background/60 backdrop-blur-sm px-4 h-[60px] border-b w-full md:w-[calc(100%-var(--sidebar-width))] flex items-center justify-between">
      <ToggleSidebar />
      <div v-if="settingsStore.isLoaded" class="ml-2 inline-flex items-center">
        <Avatar class="w-8 h-8 mr-2">
          <AvatarImage v-if="userStore.profileImage" :src="userStore.profileImage" />
          <AvatarFallback v-if="settingsStore.isLoaded && hasUser">{{ settingsStore.settings.account?.slice(0, 2) }}</AvatarFallback>
        </Avatar>
        <span class="font-bold max-w-[150px] md:max-w-full truncate" v-if="settingsStore.isLoaded && hasUser">@{{ settingsStore.settings.account }}</span>
      </div>
      <div class="ml-auto inline-flex items-center space-x-4 md:space-x-6">
        <ThemeSwitch class="w-6 h-6" />
        <Button variant="outline" class="[&_svg]:size-6 px-2 md:px-4" @click="settingsStore.isLoaded && hasUser ? logout() : walletStore.openWalletSelectModal()">
          <img v-if="hasUser" :src="getWalletIcon(settingsStore.settings.wallet!)" class="h-6 w-6" />
          <span v-if="settingsStore.isLoaded && hasUser">
            <span class="font-bold hidden md:inline">Disconnect</span>
            <svg class="inline md:hidden" width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path style="fill: hsl(var(--foreground))" :d="mdiLogout"></path>
            </svg>
          </span>
          <span v-else>Connect</span>
        </Button>
      </div>
    </div>
  </header>
</template>