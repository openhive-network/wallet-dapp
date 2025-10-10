<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMLoginForm from '@/components/HTMLoginForm.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const router = useRouter();
const showLoginForm = ref(false);

// Show HTM login form
const showHTMLogin = () => {
  showLoginForm.value = true;
};

// Handle successful login
const onLoginSuccess = () => {
  showLoginForm.value = false;
  // Redirect to my balance page after successful login
  router.push('/tokens/my-balance');
};

// TODO: Implement actual HTM account registration
const registerHTMAccount = () => {
  // This will be implemented later - it's a more complex process
  // For now, show a placeholder message
  toast.info('HTM Account registration will be implemented soon!', {
    description: 'This feature is coming in a future update.'
  });
};
</script>

<template>
  <div class="container mx-auto py-12 px-4 max-w-2xl">
    <!-- Show HTM Login Form -->
    <div
      v-if="showLoginForm"
      class="flex justify-center"
    >
      <HTMLoginForm
        :show-close-button="true"
        title="HTM Login"
        description="Login to your existing HTM account or create a new one"
        @success="onLoginSuccess"
        @close="showLoginForm = false"
      />
    </div>

    <!-- Show registration options -->
    <Card v-else>
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">
          Register HTM Account
        </CardTitle>
        <CardDescription>
          Create an account on the Hive Token Machine to manage your custom tokens
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="text-center space-y-4">
          <p class="text-sm text-muted-foreground">
            HTM accounts allow you to create, manage, and transfer custom tokens on the Hive blockchain.
            You can create a new HTM account or login to an existing one.
          </p>

          <!-- Registration options -->
          <div class="space-y-3">
            <Button
              size="lg"
              class="w-full"
              @click="registerHTMAccount"
            >
              <!-- TODO: Actual registration / Allow to log into HTM account -->
              Register New HTM Account
            </Button>

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
              @click="showHTMLogin"
            >
              Login to Existing HTM Account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
