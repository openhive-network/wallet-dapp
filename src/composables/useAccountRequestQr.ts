import { onMounted, onUnmounted, ref } from 'vue';


import { useAccountRequestStore } from '@/stores/account-request.store';
import { generateQrCodeDataUrl } from '@/utils/qr/create-qr';

import { ACCOUNT_REQUEST_CREATE_PATH, ACCOUNT_REQUEST_TOKEN_QUERY_PARAM } from '#shared/types/account-request';

const QR_CODE_SIZE = 512;
/** Extra delay after the token window ends, so the backend already serves the next token */
const REFRESH_GRACE_MS = 50;
const MIN_REFRESH_DELAY_MS = 250;
const RETRY_DELAY_MS = 5_000;

export const buildCreateAccountUrl = (token: string): string => {
  const url = new URL(ACCOUNT_REQUEST_CREATE_PATH, window.location.origin);
  url.searchParams.set(ACCOUNT_REQUEST_TOKEN_QUERY_PARAM, token);

  return url.toString();
};

/**
 * Keeps an onboarding QR code in sync with the rotating backend token.
 * The next refresh is scheduled from the TTL reported by the backend, so the QR code
 * changes exactly when the token rotates (interval configured on the backend).
 */
export const useAccountRequestQr = () => {
  const accountRequestStore = useAccountRequestStore();

  const qrDataUrl = ref('');
  const isLoading = ref(true);
  const hasError = ref(false);
  const interval = ref(0);
  const ttlMs = ref(0);
  const refreshedAt = ref(0);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const clearTimer = () => {
    if (timer)
      clearTimeout(timer);

    timer = undefined;
  };

  const schedule = (delayMs: number) => {
    clearTimer();

    if (!disposed)
      timer = setTimeout(() => void refresh(), Math.max(MIN_REFRESH_DELAY_MS, delayMs));
  };

  const refresh = async () => {
    if (disposed)
      return;

    try {
      const data = await accountRequestStore.fetchRequestToken();
      const createAccountUrl = buildCreateAccountUrl(data.token);

      /* eslint-disable-next-line no-console */
      console.log('Account request QR code URL:', createAccountUrl);

      const dataUrl = await generateQrCodeDataUrl(createAccountUrl, undefined, { width: QR_CODE_SIZE });

      if (disposed)
        return;

      qrDataUrl.value = dataUrl;
      interval.value = data.interval;
      ttlMs.value = data.ttlMs;
      refreshedAt.value = Date.now();
      hasError.value = false;

      schedule(data.ttlMs + REFRESH_GRACE_MS);
    } catch {
      // The reason is logged by the backend - keep retrying until a code can be issued again
      qrDataUrl.value = '';
      hasError.value = true;

      schedule(RETRY_DELAY_MS);
    } finally {
      isLoading.value = false;
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible')
      void refresh();
  };

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void refresh();
  });

  onUnmounted(() => {
    disposed = true;
    clearTimer();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  return {
    qrDataUrl,
    isLoading,
    hasError,
    interval,
    ttlMs,
    refreshedAt,
    refresh
  };
};
