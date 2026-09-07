import type { AccountRequestVerifyResponse } from '#shared/types/account-request';

import { requireAccountRequestConfig } from '../../utils/account-request/config';
import { getClaimedTokensRepository } from '../../utils/account-request/db';
import { accountRequestFailedError } from '../../utils/account-request/http-errors';
import { isRequestTokenValid } from '../../utils/account-request/token';

/**
 * GET /api/account-request/verify?token=...
 * Read-only check whether a scanned token can still be used to request account creation.
 * Does NOT claim the token - only a real creation request does that.
 */
export default defineEventHandler(async (event): Promise<AccountRequestVerifyResponse> => {
  requireAccountRequestConfig();
  const { token } = getQuery(event);

  setResponseHeader(event, 'Cache-Control', 'no-store');

  try {
    if (typeof token !== 'string' || !await isRequestTokenValid(token))
      return { valid: false, reason: 'invalid' };

    const isClaimed = await getClaimedTokensRepository().isClaimed(token);

    return isClaimed ? { valid: false, reason: 'claimed' } : { valid: true };
  } catch (error) {
    console.error('Failed to verify an account request token:', error);
    throw accountRequestFailedError();
  }
});
