import type { AccountRequestClaimResponse } from '#shared/types/account-request';

import { requireAccountRequestConfig } from '../../utils/account-request/config';
import { createHiveAccount, type AccountCreationResult } from '../../utils/account-request/creator';
import { getClaimedTokensRepository } from '../../utils/account-request/db';
import { accountNameTakenError, accountRequestFailedError, tokenClaimedError } from '../../utils/account-request/http-errors';
import { isRequestTokenValid } from '../../utils/account-request/token';
import { parseClaimBody } from '../../utils/account-request/validation';
import { getServerWax } from '../../utils/hive/chain';

const describeError = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * POST /api/account-request/claim
 * Creates the requested Hive account on chain.
 * The token is stored before the creation starts - the unique token and account name columns reject a repeated
 * or concurrent request, so no other lock is needed. A successful creation completes the stored token,
 * a failed one keeps it used and records the failure for diagnostics.
 */
export default defineEventHandler(async (event): Promise<AccountRequestClaimResponse> => {
  requireAccountRequestConfig();

  const parsed = parseClaimBody(await readBody(event));
  if (!parsed.ok)
    throw createError({ statusCode: 400, message: parsed.error });

  const { token, accountName, method, publicKeys } = parsed.value;
  const repository = getClaimedTokensRepository();

  try {
    if (!await isRequestTokenValid(token))
      throw createError({ statusCode: 403, message: 'This account request token is invalid or has expired' });

    const wax = await getServerWax();

    if (!wax.isValidAccountName(accountName))
      throw createError({ statusCode: 400, message: 'Invalid Hive account name' });

    if (!await repository.claim({ token, accountName, method })) {
      // Rows are never removed, so a stored token means the token itself clashed - otherwise it was the account name
      throw await repository.isClaimed(token) ? tokenClaimedError() : accountNameTakenError(accountName);
    }
  } catch (error) {
    // Rejections raised above already carry their status - anything else is an unexpected failure
    if (isError(error))
      throw error;

    console.error(`Account creation request for @${accountName} could not be accepted:`, error);
    throw accountRequestFailedError();
  }

  let creation: AccountCreationResult;

  try {
    creation = await createHiveAccount({ accountName, publicKeys });
  } catch (error) {
    console.error(`Account creation for @${accountName} failed:`, error);

    try {
      await repository.fail(token, describeError(error));
    } catch (recordingError) {
      console.error(`Recording the failed creation of @${accountName} for token ${token} failed:`, recordingError);
    }

    throw accountRequestFailedError();
  }

  // The account exists on chain from now on - a failure to record that must not hide it from the user
  try {
    await repository.complete(token, creation.transactionId);
  } catch (error) {
    console.error(`Account @${accountName} was created, but completing token ${token} failed:`, error);
  }

  return { success: true, accountName, ...creation };
});
