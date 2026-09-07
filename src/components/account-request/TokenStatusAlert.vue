<script setup lang="ts">
import { computed } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AccountCreationStage } from '@/composables/useAccountCreationFlow';

const props = defineProps<{
  stage: Extract<AccountCreationStage, 'invalid' | 'claimed' | 'unavailable'>;
}>();

const content = computed(() => {
  switch (props.stage) {
  case 'claimed':
    return {
      testId: 'create-account-token-claimed',
      variant: 'warning' as const,
      title: 'This link has already been used',
      description: 'An account creation request was already submitted with this code. Scan the QR code again to get a fresh link.'
    };
  case 'unavailable':
    return {
      testId: 'create-account-unavailable',
      variant: 'destructive' as const,
      title: 'Account creation is temporarily unavailable',
      description: 'The service could not process your request. Please try again in a moment.'
    };
  default:
    return {
      testId: 'create-account-token-invalid',
      variant: 'destructive' as const,
      title: 'This link is invalid or has expired',
      description: 'Account creation links are valid only for a short time after scanning. Please scan the QR code again.'
    };
  }
});
</script>

<template>
  <Alert
    :data-testid="content.testId"
    :variant="content.variant"
  >
    <AlertTitle>{{ content.title }}</AlertTitle>
    <AlertDescription>{{ content.description }}</AlertDescription>
  </Alert>
</template>
