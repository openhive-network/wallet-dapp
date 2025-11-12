<script lang="ts" setup>
import QRCode from 'qrcode';
import { computed, onMounted, ref, watch } from 'vue';

import CTokensProvider from '@/utils/wallet/ctokens/signer';

import { Card, CardContent } from '../ui/card';

const props = defineProps<{
  assetNum: number | string;
  amount?: string;
  memo?: string;
}>();

const qrCodeDataUrl = ref<string>('');

const userOperationalKey = computed(() => CTokensProvider.getOperationalPublicKey());

const generateQRCode = async () => {
  // Generate QR code even without amount (amount is optional)
  try {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      'asset-num': String(props.assetNum),
      to: userOperationalKey.value || ''
    });

    // Add amount only if provided
    if (props.amount?.trim())
      params.append('amount', props.amount);

    // Add memo only if provided
    if (props.memo?.trim())
      params.append('memo', props.memo);

    const url = `${baseUrl}/tokens/send-token?${params.toString()}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    qrCodeDataUrl.value = dataUrl;
    console.log('Generated QR code for URL:', url);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    qrCodeDataUrl.value = '';
  }
};

// Generate QR code on mount and when props change
onMounted(() => {
  generateQRCode();
});

watch([() => props.assetNum, () => props.amount, () => props.memo, userOperationalKey], () => {
  generateQRCode();
});
</script>

<template>
  <div>
    <Card>
      <CardContent class="flex flex-col items-center">
        <div v-if="qrCodeDataUrl" class="bg-white p-3 rounded-lg my-3">
          <img :src="qrCodeDataUrl" alt="QR Code for token transfer" class="w-48 h-48 object-contain">
        </div>
        <div v-else class="bg-white p-3 rounded-lg my-3 flex items-center justify-center" style="width:200px; height:200px;">
          <p class="text-muted-foreground text-center">Generating QR code...</p>
        </div>
        <p class="text-xs text-muted-foreground text-center max-w-md">
          This QR code contains the transfer details. <br> The receiver can scan it to accept the token.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
