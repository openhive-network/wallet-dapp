<script setup lang="ts">
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const encryptKeys = defineModel<boolean>('encryptKeys', { required: true });
const password = defineModel<string>('password', { required: true });
const repeatPassword = defineModel<string>('repeatPassword', { required: true });

defineProps<{
  showWarning?: boolean;
  passwordsMatch?: boolean;
}>();
</script>

<template>
  <div class="space-y-4">
    <!-- Encryption Toggle -->
    <div class="flex items-center justify-between space-x-2">
      <div class="space-y-0.5">
        <Label for="encrypt-keys" class="text-base">
          Encrypt keys using password
        </Label>
        <p class="text-xs text-muted-foreground">
          Protect your keys with a password (recommended)
        </p>
      </div>
      <Switch
        id="encrypt-keys"
        v-model="encryptKeys"
        data-testid="htm-encrypt-toggle"
      />
    </div>

    <!-- Warning when encryption is disabled -->
    <Alert v-if="showWarning" variant="warning">
      <AlertDescription>
        <strong>Auto-Login Enabled:</strong> Your keys will be encrypted with a random password that's automatically stored in your browser. You'll be logged in automatically when you visit HTM pages. This is convenient but less secure than using a password you control.
      </AlertDescription>
    </Alert>

    <!-- Password fields (only when encryption is enabled) -->
    <div v-if="encryptKeys" class="space-y-4">
      <div class="space-y-1">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="password"
          data-testid="htm-password"
          type="password"
          placeholder="Enter a password to encrypt the wallet"
        />
      </div>
      <div class="space-y-1">
        <Label for="repeatPassword">Repeat Password</Label>
        <Input
          id="repeatPassword"
          v-model="repeatPassword"
          data-testid="htm-repeat-password"
          type="password"
          placeholder="Repeat the password"
        />
      </div>

      <div v-if="password && repeatPassword && !passwordsMatch">
        <p class="text-sm text-red-500">
          Passwords do not match
        </p>
      </div>
    </div>
  </div>
</template>
