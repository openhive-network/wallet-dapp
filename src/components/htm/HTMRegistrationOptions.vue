<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const emit = defineEmits(['showRegistrationForm', 'showLoginForm']);

// Navigate to registration page
const showRegistration = () => {
  emit('showRegistrationForm');
};

// Show HTM login
const showHTMLogin = () => {
  emit('showLoginForm');
};
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">
        HTM Access Required
      </CardTitle>
      <CardDescription>
        To access Hive Token Machine features, you need to register a new account or login to an existing one.
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
            @click="showRegistration"
          >
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
</template>
