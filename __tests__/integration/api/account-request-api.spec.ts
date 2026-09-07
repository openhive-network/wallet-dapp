/**
 * Integration Tests: Account Request API
 *
 * Exercises the real Nuxt server routes:
 * - GET  /api/account-request/token   - rotating token
 * - GET  /api/account-request/verify  - read-only token check
 * - POST /api/account-request/claim   - stores the token (the insert is the lock) and creates the account
 *
 * Requires the creator credentials on the server (playwright.config.ts sets throwaway ones for the managed dev
 * server - the creator account does not exist on chain, so every creation attempt fails once the token was stored),
 * which lets us assert that the first accepted request uses the token up for good.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

const STATUS_ENDPOINT = '/api/account-request/status';
const TOKEN_ENDPOINT = '/api/account-request/token';
const VERIFY_ENDPOINT = '/api/account-request/verify';
const CLAIM_ENDPOINT = '/api/account-request/claim';

const SAMPLE_PUBLIC_KEYS = {
  owner: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX',
  active: 'STM7YktNxTVsXPGZSoqP8VpBnHbP9VNfGDhnKnPU3MUPQnw7WUULP',
  posting: 'STM5jZtLoV8YbxCxr4imnbWn61zMB24wwonpnVhfXRmv7j6fk3dTH',
  memo: 'STM6FATcpWJfyxyuGWYzrYxRhCF6R11E6gKdNb89PaZ5mSbQm8fYq'
};

interface TokenResponse {
  token: string;
  interval: number;
  ttlMs: number;
}

/** Stored account names survive between runs (the claims database is never reset), so every run needs fresh ones */
const uniqueAccountName = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

async function fetchToken (request: APIRequestContext): Promise<TokenResponse | null> {
  const response = await request.get(TOKEN_ENDPOINT);

  if (response.status() === 503)
    return null;

  expect(response.ok()).toBeTruthy();

  return await response.json() as TokenResponse;
}

async function verify (request: APIRequestContext, token: string) {
  const response = await request.get(VERIFY_ENDPOINT, { params: { token } });
  expect(response.ok()).toBeTruthy();

  return await response.json() as { valid: boolean; reason?: string; account?: unknown };
}

const claim = (request: APIRequestContext, token: string, accountName: string) => request.post(CLAIM_ENDPOINT, {
  data: { token, accountName, method: 'password', publicKeys: SAMPLE_PUBLIC_KEYS }
});

test.describe('Account Request API', () => {
  // Tests share the server's rotating token and the claims database - running them in parallel would interfere
  test.describe.configure({ mode: 'serial' });

  test('status endpoint should always respond, reporting whether the optional module is enabled', async ({ request }) => {
    const response = await request.get(STATUS_ENDPOINT);
    expect(response.ok()).toBeTruthy();

    const { enabled } = await response.json() as { enabled: boolean };
    expect(typeof enabled).toBe('boolean');

    // The module counts as enabled only when the creator account and its active key are configured
    const tokenResponse = await request.get(TOKEN_ENDPOINT);
    if (tokenResponse.status() === 503)
      expect(enabled).toBe(false);
  });


  test('token endpoint should return a base58 token with refresh metadata', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    expect(data!.token).toMatch(/^[1-9A-HJ-NP-Za-km-z]{16,256}$/);
    expect(data!.interval).toBeGreaterThan(0);
    expect(data!.ttlMs).toBeGreaterThanOrEqual(0);
    expect(data!.ttlMs).toBeLessThanOrEqual(data!.interval * 1000);
  });

  test('token endpoint should issue independently valid tokens on every call', async ({ request }) => {
    const first = await fetchToken(request);
    test.skip(first === null, 'Account request service is not configured on the target server');

    const [a, b] = await Promise.all([fetchToken(request), fetchToken(request)]);

    expect(await verify(request, a!.token)).toEqual({ valid: true });
    expect(await verify(request, b!.token)).toEqual({ valid: true });
  });

  test('verify should accept a fresh token repeatedly without claiming it', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    expect(await verify(request, data!.token)).toEqual({ valid: true });
    expect(await verify(request, data!.token)).toEqual({ valid: true });
  });

  test('verify should reject unknown or malformed tokens', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    expect(await verify(request, 'deadbeefdeadbeef')).toEqual({ valid: false, reason: 'invalid' });
    expect(await verify(request, 'not-a-token')).toEqual({ valid: false, reason: 'invalid' });

    const missing = await request.get(VERIFY_ENDPOINT);
    expect(await missing.json()).toEqual({ valid: false, reason: 'invalid' });
  });

  test('claim should reject malformed bodies', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    const response = await request.post(CLAIM_ENDPOINT, { data: { token: data!.token, accountName: 'someone' } });

    expect(response.status()).toBe(400);
  });

  test('claim should reject invalid tokens', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    const response = await claim(request, 'deadbeefdeadbeef', 'someone');

    expect(response.status()).toBe(403);
  });

  test('claim should accept only one of concurrent requests for the same token', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    const alpha = uniqueAccountName('qr-a');
    const beta = uniqueAccountName('qr-b');

    // Same token used three times at once, including the same name twice - the database lets exactly one insert through
    const responses = await Promise.all([claim(request, data!.token, alpha), claim(request, data!.token, beta), claim(request, data!.token, alpha)]);
    const rejected = responses.filter(response => response.status() === 409);

    expect(rejected).toHaveLength(2);
    for (const response of rejected)
      expect((await response.json()).message).toMatch(/already/);

    // The accepted request fails at the on-chain creation (no creator account) - the token is used up either way
    const accepted = responses.find(response => response.status() !== 409)!;
    expect(accepted.ok()).toBeFalsy();
    expect(await verify(request, data!.token)).toEqual({ valid: false, reason: 'claimed' });
  });

  test('claim should keep the token used when the creation fails', async ({ request }) => {
    const data = await fetchToken(request);
    test.skip(data === null, 'Account request service is not configured on the target server');

    const accountName = uniqueAccountName('qr-f');

    // The creator account does not exist on chain, so the creation must fail...
    const response = await claim(request, data!.token, accountName);
    expect(response.status()).toBe(500);

    // ...yet the token was stored with the request and cannot be used again
    expect(await verify(request, data!.token)).toEqual({ valid: false, reason: 'claimed' });

    const retry = await claim(request, data!.token, accountName);
    expect(retry.status()).toBe(409);
    expect((await retry.json()).message).toMatch(/already been used/);
  });

  test('claim should reject an account name already requested with another token', async ({ request }) => {
    const first = await fetchToken(request);
    test.skip(first === null, 'Account request service is not configured on the target server');

    const accountName = uniqueAccountName('qr-n');
    expect((await claim(request, first!.token, accountName)).status()).toBe(500);

    const second = await fetchToken(request);
    const response = await claim(request, second!.token, accountName);

    expect(response.status()).toBe(409);
    expect((await response.json()).message).toMatch(/already been requested/);

    // The rejected request did not use the second token up
    expect(await verify(request, second!.token)).toEqual({ valid: true });
  });
});
