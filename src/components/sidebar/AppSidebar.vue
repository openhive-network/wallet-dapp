<script setup lang="ts">
import { mdiHomeOutline, mdiMessageLockOutline, mdiFileSign, mdiAccountPlusOutline, mdiAccountArrowUpOutline } from "@mdi/js"
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSettingsStore, getWalletIcon } from '@/stores/settings.store';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { useUserStore } from "@/stores/user.store";

const settingsStore = useSettingsStore();
const hasUser = computed(() => settingsStore.settings.account !== undefined);

const logout = () => {
  settingsStore.resetSettings();
  window.location.reload();
};

const { toggleSidebar, isMobile } = useSidebar();

const userStore = useUserStore();

const items = [
  {
    title: "Home",
    url: "/",
    icon: mdiHomeOutline,
  },
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
  {
    title: "Process Account Creation",
    url: "/account/create",
    icon: mdiAccountPlusOutline,
  },
  {
    title: "Process Authority Update",
    url: "/account/update",
    icon: mdiAccountArrowUpOutline,
  }
];
</script>

<template>
  <Sidebar>
    <SidebarHeader class="pb-0">
      <div class="flex items-center rounded-lg p-2 mt-1 mx-1 bg-background/40 border" v-if="settingsStore.isLoaded && hasUser">
        <Avatar class="w-8 h-8 mr-2">
          <AvatarImage v-if="userStore.profileImage" :src="userStore.profileImage" />
          <AvatarFallback>{{ settingsStore.settings.account?.slice(0, 2) }}</AvatarFallback>
        </Avatar>
        <span class="font-bold">@{{ settingsStore.settings.account }}</span>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel class="text-foreground/60">Hive Bridge</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in items" :key="item.title">
              <SidebarMenuButton asChild>
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
      <Button class="bg-background/40" variant="outline" v-if="settingsStore.isLoaded && hasUser" @click="logout">
        <img v-if="hasUser" :src="getWalletIcon(settingsStore.settings.wallet!)" class="h-6 w-6" />
        <span class="font-bold">Disconnect</span>
      </Button>
    </SidebarFooter>
  </Sidebar>
</template>

<style>
[data-sidebar="sidebar"] {
  backdrop-filter: blur(20px);
  background-color: hsla(var(--background) / 70%);
}
</style>
