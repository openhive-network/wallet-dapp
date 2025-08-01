<script setup lang="ts">
import { computed } from 'vue';

import { Button } from '@/components/ui/button';
import { getWalletIcon, UsedWallet } from '@/stores/settings.store';
import { useWalletStore } from '@/stores/wallet.store';

const props = defineProps<{
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  customClass?: string;
}>();

const emit = defineEmits<{
  click: [];
}>();

const walletStore = useWalletStore();

const isButtonDisabled = computed(() =>
  !walletStore.walletsStatus.metamask || props.disabled || props.loading
);

const buttonClass = computed(() => {
  const baseClass = 'px-8 py-4 border-[#FF5C16] border-[2px]';
  return props.customClass ? `${baseClass} ${props.customClass}` : baseClass;
});
</script>

<template>
  <Button
    :disabled="isButtonDisabled"
    :variant="variant || 'outline'"
    :size="size || 'lg'"
    :class="buttonClass"
    @click="emit('click')"
  >
    <img
      :src="getWalletIcon(UsedWallet.METAMASK)"
      class="w-[20px] mr-2"
    >
    <span class="text-md font-bold">
      <slot>Connect Metamask</slot>
    </span>
  </Button>
</template>
