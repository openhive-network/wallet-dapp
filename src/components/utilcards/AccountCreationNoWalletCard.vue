<script lang="ts" setup>
import { mdiFlashOutline, mdiLockOutline, mdiDatabase, mdiPencil } from '@mdi/js';

import FeatureElement from '../ui/FeatureElement.vue';

import AccountCreationCard from './AccountCreationCard.vue';

const features = [
  {
    icon: mdiFlashOutline,
    text: 'No wallet installation required'
  },
  {
    icon: mdiLockOutline,
    text: 'Direct key management'
  },
  {
    icon: mdiDatabase,
    text: 'Ability to receive and safely store your generated authority data'
  }
];
</script>

<template>
  <AccountCreationCard type="regular">
    <template #icon>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          :d="mdiPencil"
        />
      </svg>
    </template>
    <template #title>
      Wallet independent onboarding
    </template>
    <template #description>
      Create an account by generating and saving your authority data
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
      Continue
    </template>
  </AccountCreationCard>
</template>
