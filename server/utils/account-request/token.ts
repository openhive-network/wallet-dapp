import { withCreatorWallet } from './creator-wallet';

/** How long an issued token stays claimable - enough to fill in the form and complete a Google sign-in */
export const REQUEST_TOKEN_MAX_AGE_SECONDS = 15 * 60;
/** Tokens are issued and verified by the same server, a small tolerance only covers timer granularity */
const CLOCK_DRIFT_TOLERANCE_SECONDS = 5;

/** Beekeeper returns the encrypted buffer in base58 */
const REQUEST_TOKEN_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{16,256}$/;

const BASE = 95;
const OFFSET = 32;
const TIMESTAMP_LENGTH = 5;

/** Unix timestamp (seconds) as a fixed width string of printable ASCII characters */
export const timestampToBase95 = (timestampMs: number): string => {
  let n = Math.floor(timestampMs / 1000) >>> 0;
  let out = '';

  do {
    out = String.fromCharCode(OFFSET + (n % BASE)) + out;
    n = Math.floor(n / BASE);
  } while (n > 0);

  return out.padStart(TIMESTAMP_LENGTH, String.fromCharCode(OFFSET));
};

export const base95ToTimestamp = (value: string): number => {
  let n = 0;

  for (const ch of value)
    n = n * BASE + (ch.charCodeAt(0) - OFFSET);

  return n >>> 0;
};

export const isRequestTokenFormat = (value: unknown): value is string =>
  typeof value === 'string' && REQUEST_TOKEN_PATTERN.test(value);

/**
 * Issues a request token: the current timestamp encrypted with the creator account private key.
 * Only the holder of that key can produce a token that later decrypts to a sane timestamp.
 */
export const issueRequestToken = (nowMs: number = Date.now()): Promise<string> =>
  withCreatorWallet(({ wallet, publicKey }) => wallet.encryptData(timestampToBase95(nowMs), publicKey));

/** Decrypts the token with the creator key and returns the embedded issue timestamp (seconds), or `undefined` for foreign tokens */
export const readRequestTokenTimestamp = async (token: unknown): Promise<number | undefined> => {
  if (!isRequestTokenFormat(token))
    return undefined;

  return await withCreatorWallet(async ({ wallet, publicKey }) => {
    try {
      return base95ToTimestamp(await wallet.decryptData(token, publicKey));
    } catch {
      return undefined;
    }
  });
};

/** A token is valid when it was issued by this server within {@link REQUEST_TOKEN_MAX_AGE_SECONDS} */
export const isRequestTokenValid = async (token: unknown, nowMs: number = Date.now()): Promise<boolean> => {
  const issuedAt = await readRequestTokenTimestamp(token);
  if (issuedAt === undefined)
    return false;

  const ageSeconds = Math.floor(nowMs / 1000) - issuedAt;

  return ageSeconds >= -CLOCK_DRIFT_TOLERANCE_SECONDS && ageSeconds <= REQUEST_TOKEN_MAX_AGE_SECONDS;
};
