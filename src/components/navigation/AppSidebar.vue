<script setup lang="ts">
import { mdiHomeOutline, mdiMessageLockOutline, mdiFileSign, mdiAccountPlusOutline, mdiAccountArrowUpOutline, mdiAccountReactivateOutline, mdiLink, mdiWallet, mdiAccountGroup, mdiArrowLeft, mdiCog } from '@mdi/js';
import { computed, onMounted, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { TextTooltip } from '@/components/ui/texttooltip';
import { useWalletStore } from '@/stores/wallet.store';
import { getWax } from '@/stores/wax.store';
import { toastError } from '@/utils/parse-error';

const { public: { commitHash, snapOrigin, snapVersion, showHtmInMenu } } = useRuntimeConfig();

const props = defineProps({
  forceTokenView: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();

const walletStore = useWalletStore();
const { isMobile, setOpenMobile } = useSidebar();

// Close mobile sidebar after menu item click
const handleMenuClick = () => {
  if (isMobile.value)
    setOpenMobile(false);
};

const isL1BasedView = computed(() => walletStore.hasWallet && !walletStore.isL2Wallet);

const chainId = ref('');

const tokenItems: Array<{ title: string; url: string; icon: string; badge?: string; visible?: Ref<boolean>; disabled?: Ref<boolean> }> = [
  {
    title: 'My HTM Account',
    url: '/tokens/my-balance',
    icon: mdiWallet
  },
  {
    title: 'Tokens List',
    url: '/tokens/list',
    icon: mdiAccountGroup
  },
  {
    title: 'Register HTM Account',
    url: '/tokens/register-account',
    icon: mdiAccountPlusOutline
  }
];

const tokensGroups: { title?: string; items: Array<{ title: string; url: string; icon: string; badge?: string; visible?: Ref<boolean>; disabled?: Ref<boolean> }> }[] = [{
  items: [{
    title: 'Back to Hive Bridge',
    url: '/',
    icon: mdiArrowLeft
  }]
},
{
  title: 'Tokens',
  items: tokenItems
}];

const mainGroups: { title: string; items: Array<{ title: string; url: string; icon: string; badge?: string; visible?: Ref<boolean>; disabled?: Ref<boolean> }> }[] = [{
  title: 'Hive Account Management',
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
      visible: isL1BasedView
    },
    {
      title: 'Process Authority Update',
      url: '/account/update',
      icon: mdiAccountArrowUpOutline,
      visible: isL1BasedView
    }
  ]
}, {
  title: 'Tokens',
  items: showHtmInMenu ? tokenItems : [
    {
      title: 'My tokens',
      url: '#',
      badge: 'Soon',
      icon: mdiWallet,
      disabled: ref(true)
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
}, {
  title: 'Settings',
  items: [
    {
      title: 'Google Drive Wallet',
      url: '/settings',
      icon: mdiCog
    }
  ]
}];

const groups = computed(() => {
  if (props.forceTokenView)
    return tokensGroups;
  else
    return mainGroups;

});

const waxVersion = ref('');

const defaultSnapOrigin = snapOrigin || 'npm:@hiveio/metamask-snap'; // local:http://localhost:8080
const defaultSnapVersion: string | undefined = snapVersion || '1.6.0';

const metamaskVersion = `${defaultSnapOrigin}@${defaultSnapVersion}`;

onMounted(async () => {
  try {
    const wax = await getWax();

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    chainId.value = (wax as any).chainId; // XXX: Wait for wax update to expose chainId properly
    waxVersion.value = wax.getVersion();
  } catch(error) {
    toastError('Failed to get WAX instance:', error);
  }
});
</script>

<template>
  <Sidebar>
    <SidebarHeader class="p-0">
      <NuxtLink
        to="/"
        class="flex items-center px-4 h-[60px] border-b cursor-pointer keychainify-checked"
      >
        <img
          src="/icon.svg"
          class="h-[32px] w-[32px]"
        >
        <span class="text-foreground/80 font-bold text-xl ml-2">Hive Bridge</span>
        <span
          v-if="props.forceTokenView"
          class="text-foreground/60 ml-2 text-sm"
        >Tokens</span>
      </NuxtLink>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup
        v-for="group in groups"
        :key="group.title"
        class="pb-0"
      >
        <SidebarGroupLabel
          v-if="group.title"
          class="text-foreground/60"
        >
          {{ group.title }}
        </SidebarGroupLabel>
        <div
          v-else
          class="h-2"
        />
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="item in group.items"
              :key="item.title"
            >
              <NuxtLink
                :to="item.url"
                class="w-full keychainify-checked"
                @click="handleMenuClick"
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
                        class="ml-[6px] px-1 rounded-md bg-primary/5 text-xs sm:text-[11px] leading-[14px] text-gray-600 border border-primary/20"
                      >
                        {{ item.badge }}
                      </span>
                    </span>
                  </Button>
                </SidebarMenuButton>
              </NuxtLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <Separator />
      <sub class="text-xs text-foreground/60 text-center">
        <TextTooltip side="right">@hiveio/wax@{{ waxVersion }}</TextTooltip>
        <TextTooltip side="right">{{ metamaskVersion }}</TextTooltip>
        <TextTooltip side="right">Commit Hash: {{ commitHash.substring(0, 7) }}</TextTooltip>
        <TextTooltip side="right">Chain ID: {{ chainId }}</TextTooltip>
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
