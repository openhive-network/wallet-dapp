<script lang="ts" setup>
import { mdiShieldCheckOutline, mdiFileSign, mdiKeyOutline, mdiWallet } from '@mdi/js';

import { useWalletStore } from '@/stores/wallet.store';

import FeatureElement from '../ui/FeatureElement.vue';

import AccountCreationCard from './AccountCreationCard.vue';


const walletStore = useWalletStore();

const features = [
  {
    icon: mdiShieldCheckOutline,
    text: 'Secure wallet-based authentication'
  },
  {
    icon: mdiFileSign,
    text: 'Easy transaction signing'
  },
  {
    icon: mdiKeyOutline,
    text: 'Safely storing your derived keys in the wallet'
  }
];
</script>

<template>
  <AccountCreationCard type="metamask">
    <template #icon>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          :d="mdiWallet"
        />
      </svg>
    </template>
    <template #title>
      MetaMask integrated onboarding
    </template>
    <template #description>
      Use your existing wallet to create and manage your account securely
    </template>
    <template #features>
      <FeatureElement
        v-for="feature in features"
        :key="feature.text"
        :icon="feature.icon"
        :text="feature.text"
      />
    </template>
    <template #buttonText>
      {{ walletStore._walletsStatus.metamask ? 'Continue with MetaMask' : 'Install MetaMask' }}
    </template>
  </AccountCreationCard>
</template>
