<script setup lang="ts">
import { mdiHomeOutline, mdiMessageLockOutline, mdiFileSign, mdiAccountPlusOutline, mdiAccountArrowUpOutline } from "@mdi/js"
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSettingsStore, getWalletIcon } from '@/stores/settings.store';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { useUserStore } from "@/stores/user.store";
import ThemeSwitch from "../ui/theme-switch";
import { useWalletStore } from "@/stores/wallet.store";
import { useRouter } from "vue-router";

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);

const logout = () => {
  settingsStore.resetSettings();
  window.location.reload();
};

const router = useRouter();

const walletStore = useWalletStore();

const { toggleSidebar, isMobile } = useSidebar();

const userStore = useUserStore();

const groups = [{
  title: "Account management",
  items: [
    {
      title: "Home",
      url: "/",
      icon: mdiHomeOutline,
    },
    {
      title: "Process Account Creation",
      url: "/account/create",
      icon: mdiAccountPlusOutline,
    },
    {
      title: "Process Authority Update",
      url: "/account/update",
      icon: mdiAccountArrowUpOutline,
    },
  ]
}, {
  title: "Signing",
  items: [
  {
      title: "Memo encryption",
      url: "/sign/message",
      icon: mdiMessageLockOutline,
    },
    {
      title: "Transaction signing",
      url: "/sign/transaction",
      icon: mdiFileSign,
    },
  ]
}];
</script>

<template>
  <Sidebar>
    <SidebarHeader class="pb-0">
      <div class="flex items-center p-2">
        <img src="/icon.svg" class="h-8 w-8" />
        <span class="text-foreground/80 font-bold text-xl ml-2">Hive Bridge</span>
      </div>
      <div class="flex items-center rounded-lg p-2 mt-1 mx-1 bg-background/40 border">
        <Avatar class="w-8 h-8 mr-2">
          <AvatarImage :src="userStore.profileImage ? userStore.profileImage : '/icon.svg'" />
          <AvatarFallback v-if="settingsStore.isLoaded && hasUser">{{ settingsStore.settings.account?.slice(0, 2) }}</AvatarFallback>
        </Avatar>
        <span class="font-bold max-w-[140px] truncate" v-if="settingsStore.isLoaded && hasUser">@{{ settingsStore.settings.account }}</span>
        <ThemeSwitch class="ml-auto w-5 h-5 mr-1" />
      </div>
      <Button class="bg-background/40" variant="outline" @click="settingsStore.isLoaded && hasUser ? logout : walletStore.openWalletSelectModal()">
        <img v-if="hasUser" :src="getWalletIcon(settingsStore.settings.wallet!)" class="h-6 w-6" />
        <span class="font-bold">{{ settingsStore.isLoaded && hasUser ? 'Disconnect' : 'Connect' }}</span>
      </Button>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup class="pb-0" v-for="group in groups" :key="group.title">
        <SidebarGroupLabel class="text-foreground/60">{{ group.title }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in group.items" :key="item.title">
              <SidebarMenuButton asChild :class="{ 'bg-primary/5': router.currentRoute.value.path === item.url }">
                <RouterLink @click="isMobile && toggleSidebar()" :to="item.url">
                  <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="item.icon"/></svg>
                  <span class="text-foreground/80">{{item.title}}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
    </SidebarFooter>
  </Sidebar>
</template>

<style>
[data-sidebar="sidebar"] {
  backdrop-filter: blur(20px);
  background-color: hsla(var(--background) / 70%);
}
</style>
