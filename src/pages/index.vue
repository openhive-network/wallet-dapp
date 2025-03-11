<script setup lang="ts">
import AuthorityCard from '@/components/utilcards/AuthorityCard.vue';
import ConfirmCreateAccountCard from '@/components/utilcards/ConfirmCreateAccountCard.vue';
import MemoEncryptCard from '@/components/utilcards/MemoEncryptCard.vue';
import SignTransactionCard from '@/components/utilcards/SignTransactionCard.vue';
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-8">
    <AuthorityCard />
    <MemoEncryptCard />
    <SignTransactionCard />
    <ConfirmCreateAccountCard />
  </div>
</template>
