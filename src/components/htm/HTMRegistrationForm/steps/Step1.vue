<script setup lang="ts">
import { mdiNumeric1Circle } from '@mdi/js';

import { HTM_REGISTRATION_KEY } from '@/components/htm/HTMRegistrationForm/types';
import type { HTMRegistrationContext } from '@/components/htm/HTMRegistrationForm/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// Inject the registration context from parent
const { registrationData, encryptKeys } = inject<HTMRegistrationContext>(HTM_REGISTRATION_KEY)!;

// Show warning when encryption is disabled
const showEncryptionWarning = computed(() => !encryptKeys.value);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <svg
          width="18"
          height="18"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            style="fill: hsl(var(--primary))"
            :d="mdiNumeric1Circle"
          />
        </svg>
        <Label class="text-base font-semibold">Account Information</Label>
      </div>
    </div>

    <!-- Compact grid layout for user card style -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Display Name (required) -->
      <div class="space-y-2 md:col-span-2">
        <Label for="account-name">
          Display Name *
        </Label>
        <Input
          id="account-name"
          v-model="registrationData.name"
          type="text"
          placeholder="Enter your display name"
          required
          maxlength="50"
        />
        <p class="text-xs text-muted-foreground">
          Your public display name (max 50 characters)
        </p>
      </div>

      <!-- Website (optional) -->
      <div class="space-y-2">
        <Label for="account-website">
          Website
        </Label>
        <Input
          id="account-website"
          v-model="registrationData.website"
          type="url"
          placeholder="https://your-website.com"
        />
      </div>

      <!-- Profile Image (optional) -->
      <div class="space-y-2">
        <Label for="account-profile-image">
          Profile Image URL
        </Label>
        <Input
          id="account-profile-image"
          v-model="registrationData.profile_image"
          type="url"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <!-- About/Description (optional) -->
      <div class="space-y-2 md:col-span-2">
        <Label for="account-about">
          About
        </Label>
        <Textarea
          id="account-about"
          v-model="registrationData.about"
          placeholder="Tell us about yourself or your project..."
          rows="3"
          maxlength="500"
        />
      </div>
    </div>

    <Separator />

    <!-- Encryption Toggle -->
    <div class="space-y-4">
      <div class="flex items-center justify-between space-x-2">
        <div class="space-y-0.5">
          <Label for="encrypt-keys" class="text-base">
            Encrypt keys using password
          </Label>
          <p class="text-sm text-muted-foreground">
            Protect your keys with a password (recommended)
          </p>
        </div>
        <Switch
          id="encrypt-keys"
          v-model="encryptKeys"
        />
      </div>

      <!-- Warning when encryption is disabled -->
      <Alert v-if="showEncryptionWarning" variant="warning">
        <AlertDescription>
          <strong>Warning:</strong> Your keys will NOT be encrypted. A random password will be generated and stored in your browser's local storage. This is less secure than using a password you control.
        </AlertDescription>
      </Alert>

      <!-- Password fields (only when encryption is enabled) -->
      <div v-if="encryptKeys" class="space-y-4">
        <!-- Wallet Password (required) -->
        <div class="space-y-2">
          <Label for="wallet-password">
            Wallet Password *
          </Label>
          <Input
            id="wallet-password"
            v-model="registrationData.walletPassword"
            type="password"
            placeholder="Enter a secure password"
            required
          />
          <p class="text-xs text-muted-foreground">
            Create a password to encrypt and secure your HTM wallet locally
          </p>
        </div>

        <!-- Repeat Password (required) -->
        <div class="space-y-2">
          <Label for="repeat-password">
            Repeat Password *
          </Label>
          <Input
            id="repeat-password"
            v-model="registrationData.repeatPassword"
            type="password"
            placeholder="Repeat your password"
            required
          />
        </div>

        <div v-if="registrationData.walletPassword && registrationData.repeatPassword && registrationData.walletPassword !== registrationData.repeatPassword">
          <p class="text-sm text-red-500">
            Passwords do not match
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
