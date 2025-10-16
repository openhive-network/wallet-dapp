<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import HTMHeader from '@/components/HTMHeader.vue';
import HTMLoginForm from '@/components/HTMLoginForm.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTokensStore } from '@/stores/tokens.store';

const tokensStore = useTokensStore();
const router = useRouter();

const showLoginForm = ref(false);

const props = defineProps<{
  isPublicPage?: boolean;
}>();

// Check if user is authenticated (has wallet connected)
const isAuthenticated = computed(() => tokensStore.wallet || props.isPublicPage);

// Show HTM login form
const showHTMLogin = () => {
  showLoginForm.value = true;
};

// Handle successful login
const onLoginSuccess = () => {
  showLoginForm.value = false;
  // The authentication state will be automatically updated
};

// Navigate to registration page
const goToRegistration = () => {
  router.push('/tokens/register-account');
};
</script>

<template>
  <div class="p-8">
    <!-- Show account overview component -->
    <div v-if="isAuthenticated">
      <div class="w-full px-4 py-2 mb-2">
        <HTMHeader />
      </div>
      <Separator />
      <!-- Show slot content when authenticated -->
      <slot />
    </div>
    <!-- Show login/registration page when not authenticated -->
    <div
      v-else
      class="container mx-auto py-12 px-4 max-w-2xl"
    >
      <!-- Show HTM Login Form -->
      <div
        v-if="showLoginForm"
        class="flex justify-center"
      >
        <HTMLoginForm
          :show-close-button="true"
          title="HTM Access"
          description="Create or access your HTM wallet to manage custom tokens"
          @success="onLoginSuccess"
          @close="showLoginForm = false"
        />
      </div>

      <!-- Show selection options -->
      <Card
        v-else
        class="text-center"
      >
        <CardHeader>
          <CardTitle class="text-2xl">
            HTM Access Required
          </CardTitle>
          <CardDescription>
            To access Hive Token Machine features, you need to access your HTM wallet or register a new account.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-3">
            <p class="text-sm text-muted-foreground">
              Choose one of the options below to get started:
            </p>

            <!-- HTM Access -->
            <Button
              size="lg"
              class="w-full"
              @click="showHTMLogin"
            >
              Login to HTM Wallet
            </Button>

            <!-- Or register new HTM account -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              class="w-full"
              @click="goToRegistration"
            >
              Register HTM Account
            </Button>
          </div>

          <div class="pt-4 text-xs text-muted-foreground">
            <p>
              HTM accounts allow you to create, manage, and transfer custom tokens on the Hive blockchain.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
