<script lang="ts" setup>
import AccountCreationNoWalletCard from './AccountCreationNoWalletCard.vue';
import AccountCreationWithWalletCard from './AccountCreationWithWalletCard.vue';
</script>

<template>
  <div class="container mx-auto max-w-6xl">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold mb-4">
        Create Your Hive Account
      </h1>
      <p class="text-muted-foreground text-md">
        Choose how you'd like to create your new account. You can use an existing wallet or create an account without one.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <AccountCreationWithWalletCard />
      <AccountCreationNoWalletCard />
    </div>
  </div>
</template>
