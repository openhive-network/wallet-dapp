<script setup lang="ts">
import { mdiHomeOutline, mdiMessageLockOutline, mdiFileSign, mdiAccountPlusOutline, mdiAccountArrowUpOutline } from "@mdi/js"
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar";
import { useRouter } from "vue-router";

const router = useRouter();

const { toggleSidebar, isMobile } = useSidebar();

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
    <SidebarHeader class="p-0">
      <div class="flex items-center px-4 h-[60px] border-b">
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
[data-sidebar="sidebar"][data-mobile="true"] {
  backdrop-filter: none;
  background-color: hsl(var(--background));
}
</style>
