<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import CreateAccountCard from '@/components/account-request/CreateAccountCard.vue';

import { ACCOUNT_REQUEST_TOKEN_QUERY_PARAM } from '#shared/types/account-request';


// This page drives the Google sign-in itself, so the global Google Drive onboarding dialogs must stay out of the way
definePageMeta({
  disableGoogleDriveOnboarding: true
});

const route = useRoute();

const token = computed(() => {
  const value = route.query[ACCOUNT_REQUEST_TOKEN_QUERY_PARAM];

  return typeof value === 'string' ? value : '';
});
</script>

<template>
  <div class="p-4 sm:p-8">
    <div class="container mx-auto flex justify-center">
      <CreateAccountCard :token="token" />
    </div>
  </div>
</template>
