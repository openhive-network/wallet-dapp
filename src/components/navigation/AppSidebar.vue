<script setup lang="ts">
import { mdiHomeOutline, mdiMessageLockOutline, mdiFileSign, mdiAccountPlusOutline, mdiAccountArrowUpOutline, mdiAccountReactivateOutline } from "@mdi/js"
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet.store";
import { computed, onMounted, ref } from 'vue';
import { defaultSnapOrigin, defaultSnapVersion } from '@/utils/wallet/metamask/snap';
import { getWax } from '@/stores/wax.store';

const router = useRouter();

const { toggleSidebar, isMobile } = useSidebar();

const walletStore = useWalletStore();

const isDisabledMenuButton = computed(() => !walletStore.hasWallet);

const groups = [{
  title: "Account management",
  items: [
    {
      title: "Home",
      url: "/",
      icon: mdiHomeOutline,
    },
    {
      title: "Request Account Creation",
      url: "/account/request",
      icon: mdiAccountPlusOutline,
    },
    {
      title: "Process Account Creation",
      url: "/account/create",
      icon: mdiAccountReactivateOutline,
      disabled: isDisabledMenuButton,
    },
    {
      title: "Process Authority Update",
      url: "/account/update",
      icon: mdiAccountArrowUpOutline,
      disabled: isDisabledMenuButton,
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

const navigateTo = (url: string) => {
  router.push(url);

  if (isMobile.value)
    toggleSidebar();
};

const waxVersion = ref("");
const metamaskVersion = `${defaultSnapOrigin}@${defaultSnapVersion}`;

onMounted(async() => {
  try {
    const wax = await getWax();

    waxVersion.value = wax.getVersion();
  } catch(error) {
    console.error("Failed to get WAX instance:", error);
  }
})
</script>

<template>
  <Sidebar>
    <SidebarHeader class="p-0">
      <div class="flex items-center px-4 h-[60px] border-b cursor-pointer" @click="navigateTo('/')">
        <img src="/icon.svg" class="h-[32px] w-[32px]" />
        <span class="text-foreground/80 font-bold text-xl ml-2">Hive Bridge</span>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup class="pb-0" v-for="group in groups" :key="group.title">
        <SidebarGroupLabel class="text-foreground/60">{{ group.title }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in group.items" :key="item.title">
              <SidebarMenuButton asChild :class="{ 'bg-primary/5': router.currentRoute.value.path === item.url }">
                <Button variant="ghost" :disabled="item.disabled?.value" @click="navigateTo(item.url)" class="flex justify-start">
                  <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: hsl(var(--foreground))" :d="item.icon"/></svg>
                  <span class="text-foreground/80">{{item.title}}</span>
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <Separator />
      <sub class="text-xs text-foreground/60 flex flex-col items-center">
        <pre>@hiveio/wax@{{ waxVersion }}</pre>
        <pre>{{ metamaskVersion }}</pre>
      </sub>
    </SidebarFooter>
  </Sidebar>
</template>

<style>
[data-sidebar="sidebar"] {
  backdrop-filter: blur(20px);
  background-color: hsla(var(--background) / 70%);
}
[data-sidebar="sidebar"][data-mobile="true"] {
  backdrop-filter: none;
  background-color: hsl(var(--background));
}
</style>
