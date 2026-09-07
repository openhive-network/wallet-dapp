import type { AccountRegistrationMethod, AccountRequestClaimStatusResponse } from '#shared/types/account-request';

import { requireAccountRequestConfig } from '../../utils/account-request/config';
import { getClaimedTokensRepository } from '../../utils/account-request/db';
import { accountRequestFailedError } from '../../utils/account-request/http-errors';
import { isRequestTokenFormat } from '../../utils/account-request/token';

import type { ClaimedToken } from '~~/prisma/generated/client/client';

const toClaimStatus = (claim: ClaimedToken): AccountRequestClaimStatusResponse => {
  // Only validated request bodies are stored, so the method column always holds a known registration method
  const details = { accountName: claim.accountName, method: claim.method as AccountRegistrationMethod, claimedAt: claim.claimedAt.toISOString() };

  if (claim.completedAt && claim.transactionId)
    return { state: 'completed', transactionId: claim.transactionId, completedAt: claim.completedAt.toISOString(), ...details };

  return { state: claim.error ? 'failed' : 'pending', ...details };
};

/**
 * GET /api/account-request/claim?token=...
 * Reports what happened to the creation request made with a token. Claims are kept for good, so the status
 * (including the id of the creation transaction) stays readable long after the token itself expired.
 * The token is only a lookup key here - nothing waits for the creator wallet to validate it.
 */
export default defineEventHandler(async (event): Promise<AccountRequestClaimStatusResponse> => {
  requireAccountRequestConfig();
  const { token } = getQuery(event);

  setResponseHeader(event, 'Cache-Control', 'no-store');

  if (!isRequestTokenFormat(token))
    throw createError({ statusCode: 400, message: 'token query parameter is missing or malformed' });

  let claim: ClaimedToken | null;

  try {
    claim = await getClaimedTokensRepository().find(token);
  } catch (error) {
    console.error('Failed to read the status of an account request token:', error);
    throw accountRequestFailedError();
  }

  return claim ? toClaimStatus(claim) : { state: 'unclaimed' };
});
