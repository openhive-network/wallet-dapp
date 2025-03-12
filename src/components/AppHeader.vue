<script setup lang="ts">
import { useSettingsStore, getWalletIcon } from '@/stores/settings.store';
import { mdiLogoutVariant } from '@mdi/js';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);

const logout = () => {
  settingsStore.resetSettings();
  window.location.reload();
};
</script>

<template>
  <header class="fixed top-0 left-0 z-10 bg-black/60 backdrop-blur-sm w-full">
    <nav class="flex items-center relative sm:justify-center p-4 w-full h-[65px] border-b-[1px] border-white/25">
      <div class="hidden sm:inline absolute top-[14px] left-[30px]" v-if="hasUser">
      </div>
      <div class="flex items-center space-x-4">
        <img src="/icon.svg" class="h-8 w-8" />
        <h1 class="hidden sm:inline text-2xl font-bold tracking-widest">Hive Bridge</h1>
        <Button variant="outline" class="absolute top-[14px] left-[45px] inline-flex sm:hidden" v-if="settingsStore.isLoaded && hasUser">
          <h1 v-if="hasUser" class="inline sm:hidden text-lg sm:text-xl font-bold">@{{ settingsStore.settings.account }}</h1>
        </Button>
      </div>
      <div class="absolute top-[14px] right-[30px]">
        <Button variant="outline" v-if="settingsStore.isLoaded && hasUser" @click="logout">
          <img v-if="hasUser" :src="getWalletIcon(settingsStore.settings.wallet!)" class="h-6 w-6" />
          <span class="hidden sm:inline font-bold">Disconnect</span>
          <svg class="inline sm:hidden" width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="mdiLogoutVariant"/></svg>
        </Button>
      </div>
    </nav>
  </header>
</template>