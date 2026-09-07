import { getWax } from '@/stores/wax.store';

const ACCOUNT_VISIBILITY_TIMEOUT_MS = 30_000;
const ACCOUNT_VISIBILITY_POLL_INTERVAL_MS = 3_000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const isAccountOnChain = async (accountName: string): Promise<boolean> => {
  const wax = await getWax();
  const { accounts } = await wax.api.database_api.find_accounts({ accounts: [accountName] });

  return accounts.some(account => account.name === accountName);
};

/**
 * The claim responds as soon as the creation was broadcast - the account becomes readable once a block includes it.
 * Resolves with `false` when the account is still not visible after the timeout.
 */
export const waitForAccountOnChain = async (accountName: string): Promise<boolean> => {
  const deadline = Date.now() + ACCOUNT_VISIBILITY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      if (await isAccountOnChain(accountName))
        return true;
    } catch {
      // Transient API error - keep polling until the deadline
    }

    await sleep(ACCOUNT_VISIBILITY_POLL_INTERVAL_MS);
  }

  return false;
};
