<script setup lang="ts">
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import OnboardingButton from "@/components/onboarding/OnboardingWalletButton.vue";
import { onMounted, ref } from 'vue';
import { useMetamaskStore } from "@/stores/metamask.store";
import { getWalletIcon, UsedWallet } from "@/stores/settings.store";

const hasMetamask = ref(false);
const hasKeychain = ref(false);
const hasPeakVault = ref(false);

const metamaskStore = useMetamaskStore();

onMounted(() => {
  metamaskStore.connect().then(() => hasMetamask.value = true).catch(console.error);
  hasKeychain.value = "hive_keychain" in window;
  hasPeakVault.value = "peakvault" in window;
});

const emit = defineEmits(["walletSelect"]);

const useWallet = (type: UsedWallet) => {
  emit("walletSelect", type);
};
</script>

<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>Select wallet</CardTitle>
      <CardDescription>We support multiple on-chain wallets</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <OnboardingButton :disabled="!hasMetamask" @click="useWallet(UsedWallet.METAMASK)" :logoUrl="getWalletIcon(UsedWallet.METAMASK)" name="Metamask" description="Use your derived keys"/>
      <OnboardingButton :disabled="!hasKeychain" @click="useWallet(UsedWallet.KEYCHAIN)" :logoUrl="getWalletIcon(UsedWallet.KEYCHAIN)" name="Keychain" description="Use already imported accounts"/>
      <OnboardingButton :disabled="!hasPeakVault" @click="useWallet(UsedWallet.PEAKVAULT)" :logoUrl="getWalletIcon(UsedWallet.PEAKVAULT)" name="PeakVault" description="Use already imported accounts"/>
    </CardContent>
    <CardFooter></CardFooter>
  </Card>
</template>
