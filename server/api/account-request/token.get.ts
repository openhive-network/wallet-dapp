import type { AccountRequestTokenResponse } from '#shared/types/account-request';

import { requireAccountRequestConfig } from '../../utils/account-request/config';
import { accountRequestFailedError } from '../../utils/account-request/http-errors';
import { issueRequestToken } from '../../utils/account-request/token';

/**
 * GET /api/account-request/token
 * Issues a fresh account request token encoded in the onboarding QR code
 */
export default defineEventHandler(async (event): Promise<AccountRequestTokenResponse> => {
  const config = requireAccountRequestConfig();

  setResponseHeader(event, 'Cache-Control', 'no-store');

  let token: string;
  try {
    token = await issueRequestToken();
  } catch (error) {
    console.error('Failed to issue an account request token:', error);
    throw accountRequestFailedError();
  }

  return {
    token,
    interval: config.tokenInterval,
    ttlMs: config.tokenInterval * 1000
  };
});
