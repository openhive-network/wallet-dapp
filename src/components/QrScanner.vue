<script setup lang="ts">
import type { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-vue-next';
import { onUnmounted, ref, watch } from 'vue';

import { Button } from '@/components/ui/button';
import { toastError } from '@/utils/parse-error';

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'scan', result: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const scannerContainer = ref<HTMLDivElement>();
const isLoading = ref(true);
const html5QrCode = ref<Html5Qrcode | null>(null);

const closeScanner = () => {
  emit('update:modelValue', false);
};

const stopScanner = async () => {
  if (html5QrCode.value) {
    try {
      await html5QrCode.value.stop();
      html5QrCode.value.clear();
    } catch {
      // Silently ignore errors when stopping scanner
    }
  }
};

const onScanSuccess = (decodedText: string) => {
  emit('scan', decodedText);
  stopScanner();
  closeScanner();
};

const onScanError = () => {
  // Silently ignore scan errors (happens frequently during normal scanning)
};

const startScanner = async () => {
  try {
    // Dynamically import html5-qrcode
    const { Html5Qrcode } = await import('html5-qrcode');

    if (!scannerContainer.value) return;

    html5QrCode.value = new Html5Qrcode('qr-reader');

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    await html5QrCode.value.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanError
    );

    isLoading.value = false;
  } catch (error) {
    toastError('Failed to start QR scanner:', error);
    closeScanner();
  }
};

// Watch modelValue to start/stop scanner
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    isLoading.value = true;
    await startScanner();
  } else
    await stopScanner();

}, { immediate: true });

onUnmounted(async () => {
  await stopScanner();
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style="pointer-events: auto;"
        @click.self="closeScanner"
      >
        <div
          class="relative bg-background rounded-lg shadow-xl max-w-md w-full overflow-hidden"
          style="pointer-events: auto;"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b">
            <h3 class="text-lg font-semibold">Scan QR Code</h3>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              @click.stop="closeScanner"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- Scanner Container -->
          <div class="p-4">
            <div
              v-if="isLoading"
              class="flex flex-col items-center justify-center gap-4 py-12"
            >
              <div class="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <p class="text-sm text-muted-foreground">Initializing camera...</p>
            </div>

            <div
              id="qr-reader"
              ref="scannerContainer"
              class="w-full rounded-lg overflow-hidden"
            />

            <p class="text-sm text-muted-foreground text-center mt-4">
              Point your camera at a QR code to scan
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Override html5-qrcode default styles */
:deep(#qr-reader) {
  border: none !important;
}

:deep(#qr-reader video) {
  border-radius: 0.5rem;
}

:deep(#qr-reader__dashboard_section) {
  display: none !important;
}

:deep(#qr-reader__camera_selection) {
  display: none !important;
}
</style>
