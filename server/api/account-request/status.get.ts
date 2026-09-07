import type { AccountRequestStatusResponse } from '#shared/types/account-request';

import { getAccountRequestConfig } from '../../utils/account-request/config';

/**
 * GET /api/account-request/status
 * Tells the UI whether the QR onboarding module is configured on this server.
 * The module is optional - the rest of the application works without it.
 */
export default defineEventHandler((event): AccountRequestStatusResponse => {
  setResponseHeader(event, 'Cache-Control', 'no-store');

  return {
    enabled: !!getAccountRequestConfig()
  };
});
