<script setup lang="ts">
import { mdiHomeOutline, mdiMessageLockOutline, mdiFileSign, mdiAccountPlusOutline, mdiAccountArrowUpOutline, mdiAccountReactivateOutline, mdiSendOutline, mdiLink, mdiWallet, mdiViewList } from '@mdi/js';
import { computed, onMounted, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem , useSidebar } from '@/components/ui/sidebar';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { defaultSnapOrigin, defaultSnapVersion } from '@/utils/wallet/metamask/snap';

const router = useRouter();

const { toggleSidebar, isMobile } = useSidebar();

const walletStore = useWalletStore();

const isLoggedIn = computed(() => walletStore.hasWallet);

const groups: { title: string; items: Array<{ title: string; url: string; icon: string; badge?: string; visible?: Ref<boolean>; disabled?: Ref<boolean> }> }[] = [{
  title: 'Account management',
  items: [
    {
      title: 'Home',
      url: '/',
      icon: mdiHomeOutline
    },
    {
      title: 'Request Account Creation',
      url: '/account/request',
      icon: mdiAccountPlusOutline
    },
    {
      title: 'Process Account Creation',
      url: '/account/create',
      icon: mdiAccountReactivateOutline,
      visible: isLoggedIn
    },
    {
      title: 'Process Authority Update',
      url: '/account/update',
      icon: mdiAccountArrowUpOutline,
      visible: isLoggedIn
    }
  ]
}, {
  title: 'Finances',
  items: [
    {
      title: 'Account Balances',
      url: '/finances/account-balances',
      icon: mdiWallet
    },
    {
      title: 'Send transfer',
      url: '/finances/transfer',
      icon: mdiSendOutline
    },
    {
      title: 'My Token Definitions',
      url: '/finances/token-definitions',
      icon: mdiViewList
    }
  ]
}, {
  title: 'Automation',
  items: [
    {
      title: 'Authorize dApp',
      url: '/automation/authorize',
      icon: mdiLink
    }
  ]
}, {
  title: 'Signing',
  items: [
    {
      title: 'Memo encryption',
      url: '/sign/message',
      icon: mdiMessageLockOutline
    },
    {
      title: 'Transaction signing',
      url: '/sign/transaction',
      icon: mdiFileSign
    }
  ]
}];

const navigateTo = (url: string) => {
  router.push(url);

  if (isMobile.value)
    toggleSidebar();
};

const waxVersion = ref('');
const metamaskVersion = `${defaultSnapOrigin}@${defaultSnapVersion}`;
const commitHash = __COMMIT_HASH__;

onMounted(async () => {
  try {
    const wax = await getWax();

    waxVersion.value = wax.getVersion();
  } catch(error) {
    console.error('Failed to get WAX instance:', error);
  }
});
</script>

<template>
  <Sidebar>
    <SidebarHeader class="p-0">
      <div
        class="flex items-center px-4 h-[60px] border-b cursor-pointer"
        @click="navigateTo('/')"
      >
        <img
          src="/icon.svg"
          class="h-[32px] w-[32px]"
        >
        <span class="text-foreground/80 font-bold text-xl ml-2">Hive Bridge</span>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup
        v-for="group in groups"
        :key="group.title"
        class="pb-0"
      >
        <SidebarGroupLabel class="text-foreground/60">
          {{ group.title }}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="item in group.items"
              :key="item.title"
            >
              <SidebarMenuButton
                v-if="item.visible === undefined || item.visible?.value"
                as-child
                :class="{ 'bg-primary/5': router.currentRoute.value.path === item.url }"
              >
                <Button
                  variant="ghost"
                  :disabled="item.disabled?.value"
                  class="flex justify-start"
                  @click="navigateTo(item.url)"
                >
                  <svg
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  ><path
                    style="fill: hsl(var(--foreground))"
                    :d="item.icon"
                  /></svg>
                  <span class="text-foreground/80 flex items-center">
                    {{ item.title }}
                    <span
                      v-if="item.badge"
                      class="ml-[6px] px-1 rounded-md bg-primary/5 text-[11px]/[14px] text-gray-600 border border-primary/20"
                    >
                      {{ item.badge }}
                    </span>
                  </span>
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
        <pre>Commit Hash: {{ commitHash.substring(0, 7) }}</pre>
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
