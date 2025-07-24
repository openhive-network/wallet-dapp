<script setup lang="ts">
import RequestAccountCreate from '@/components/utilcards/RequestAccountCreate.vue';
import RequestAccountCreateWithWallet from '@/components/utilcards/RequestAccountCreateWithWallet.vue';
import { Button } from '@/components/ui/button';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const method = computed(() => route.query.method as string);
const isWalletMethod = computed(() => method.value === 'wallet');
</script>

<template>
  <div class="p-8">
    <div class="container mx-auto flex flex-col items-center pt-8">
      <div v-if="isWalletMethod" class="w-full max-w-2xl mb-4">
        <Button
          variant="ghost"
          @click="router.push('/account/request')"
          class="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
        >
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          <span>Back</span>
        </Button>
      </div>
      <RequestAccountCreateWithWallet v-if="isWalletMethod" />
      <RequestAccountCreate v-else />
    </div>
  </div>
</template>
