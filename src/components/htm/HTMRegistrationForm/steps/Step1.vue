<script setup lang="ts">
import { mdiNumeric1Circle } from '@mdi/js';

import HTMPasswordFields from '@/components/htm/HTMPasswordFields.vue';
import { HTM_REGISTRATION_KEY } from '@/components/htm/HTMRegistrationForm/types';
import type { HTMRegistrationContext } from '@/components/htm/HTMRegistrationForm/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

// Inject the registration context from parent
const { registrationData, encryptKeys, password, repeatPassword, showEncryptionWarning, passwordsMatch } = inject<HTMRegistrationContext>(HTM_REGISTRATION_KEY)!;
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

    <!-- Password Fields Component -->
    <div class="space-y-4">
      <HTMPasswordFields
        v-model:encrypt-keys="encryptKeys"
        v-model:password="password"
        v-model:repeat-password="repeatPassword"
        :show-warning="showEncryptionWarning"
        :passwords-match="passwordsMatch"
      />
    </div>
  </div>
</template>
