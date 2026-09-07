/**
 * E2E Tests: Account Onboarding via QR Code
 *
 * - /features/request-account renders a periodically refreshed QR code
 * - /features/create-account verifies the scanned token and creates the account
 *
 * The account request API is mocked - the on-chain creation is covered by the backend.
 */

import { test, expect, type Page } from '@playwright/test';

import { mockHiveApi } from '../../helpers/api-mocks';
import * as selectors from '../../helpers/selectors';

const TEST_TOKEN = 'a1b2c3d4e5f60718';
const CREATE_ACCOUNT_URL = `/features/create-account?token=${TEST_TOKEN}`;
const NEW_ACCOUNT_NAME = 'qr-newcomer';
const STRONG_PASSWORD = 'correct-horse-battery-staple';

interface VerifyResponse {
  valid: boolean;
  reason?: 'invalid' | 'claimed';
}

const jsonResponse = (status: number, body: unknown) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

const apiError = (status: number, message: string) => jsonResponse(status, { statusCode: status, message });

async function mockTokenEndpoint (page: Page, token = TEST_TOKEN, ttlMs = 3000, onRequest?: () => void) {
  await page.route('**/api/account-request/token', async (route) => {
    onRequest?.();
    await route.fulfill(jsonResponse(200, { token, interval: 3, ttlMs }));
  });
}

async function mockStatusEndpoint (page: Page, enabled: boolean) {
  await page.route('**/api/account-request/status', async (route) => {
    await route.fulfill(jsonResponse(200, { enabled }));
  });
}

/** The verify response may change over time (e.g. once the token was used) - it is resolved on every request */
async function mockVerifyEndpoint (page: Page, response: VerifyResponse | (() => VerifyResponse)) {
  await page.route('**/api/account-request/verify**', async (route) => {
    await route.fulfill(jsonResponse(200, typeof response === 'function' ? response() : response));
  });
}

/** Answers the claim like the backend does and hands the request body over for assertions */
async function mockClaimEndpoint (page: Page, onClaim?: (claimBody: Record<string, unknown>) => void) {
  await page.route('**/api/account-request/claim', async (route) => {
    const claimBody = route.request().postDataJSON() as Record<string, unknown>;
    onClaim?.(claimBody);
    await route.fulfill(jsonResponse(200, { success: true, accountName: claimBody.accountName, transactionId: 'f'.repeat(40) }));
  });
}

async function openCreateAccountPage (page: Page, url = CREATE_ACCOUNT_URL) {
  await page.goto(url);
  // Let the dev server settle (cold Vite dependency optimization may reload the page right after navigation)
  await page.waitForLoadState('networkidle');
  await expect(page.locator(selectors.accountRequest.form)).toBeVisible({ timeout: 15000 });
}

/** Measures horizontal page overflow and lists the widest offenders to make failures actionable */
async function getHorizontalOverflow (page: Page) {
  return await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      // Fixed elements do not extend the document scroll width, yet mobile browsers still pan to reveal them
      .filter(({ rect }) => rect.width > 0 && rect.right > viewportWidth + 1)
      .slice(0, 8)
      .map(({ element, rect }) => {
        const testId = element.getAttribute('data-testid');
        const classes = [...element.classList].slice(0, 5).join('.');
        return `${element.tagName.toLowerCase()}${testId ? `[${testId}]` : ''}.${classes} right=${Math.round(rect.right)}`;
      });

    return { scrollWidth: document.documentElement.scrollWidth, viewportWidth, offenders };
  });
}

async function expectNoHorizontalOverflow (page: Page) {
  const overflow = await getHorizontalOverflow(page);
  const details = `Offenders:\n${overflow.offenders.join('\n')}`;

  expect(overflow.scrollWidth, `Page overflows horizontally. ${details}`).toBeLessThanOrEqual(overflow.viewportWidth);
  expect(overflow.offenders, `Elements extend beyond the viewport. ${details}`).toEqual([]);
}

async function fillAccountName (page: Page, name: string) {
  const nameInput = page.locator(selectors.accountRequest.nameInput);
  await nameInput.fill(name);
  await expect(nameInput).toHaveValue(name);
  // Method buttons become enabled once the (debounced) account name validation passes
  await expect(page.locator(selectors.accountRequest.methodPassword)).toBeEnabled({ timeout: 20000 });
}

async function submitWithPassword (page: Page, name = NEW_ACCOUNT_NAME) {
  await fillAccountName(page, name);
  await page.locator(selectors.accountRequest.methodPassword).click();
  await page.locator(selectors.accountRequest.passwordInput).fill(STRONG_PASSWORD);
  await page.locator(selectors.accountRequest.passwordRepeatInput).fill(STRONG_PASSWORD);
  await page.locator(selectors.accountRequest.passwordSubmit).click();
}

test.describe('Account Onboarding via QR Code', () => {

  test.describe('Module availability', () => {

    test('should hide the menu entry when the module is not configured on the server', async ({ page }) => {
      await mockStatusEndpoint(page, false);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page.locator(selectors.navigation.home).first()).toBeVisible();
      await expect(page.locator(selectors.navigation.onboardingQrCode)).toHaveCount(0);
    });

    test('should show the menu entry when the module is configured on the server', async ({ page }) => {
      await mockStatusEndpoint(page, true);

      await page.goto('/');

      await expect(page.locator(selectors.navigation.onboardingQrCode).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Request account page', () => {

    test('should render a QR code generated from the backend token', async ({ page }) => {
      await mockTokenEndpoint(page);

      await page.goto('/features/request-account');

      await expect(page.locator(selectors.accountRequest.qrCard)).toBeVisible();

      const qrImage = page.locator(selectors.accountRequest.qrImage);
      await expect(qrImage).toBeVisible({ timeout: 15000 });
      await expect(qrImage).toHaveAttribute('src', /^data:image\/png/);
    });

    test('should refresh the QR code when the token rotates', async ({ page }) => {
      let tokenRequests = 0;
      await mockTokenEndpoint(page, TEST_TOKEN, 500, () => { tokenRequests++; });

      await page.goto('/features/request-account');
      await expect(page.locator(selectors.accountRequest.qrImage)).toBeVisible({ timeout: 15000 });

      await expect.poll(() => tokenRequests, { timeout: 10000 }).toBeGreaterThanOrEqual(3);
    });

    test('should show an error when the service is not configured', async ({ page }) => {
      await page.route('**/api/account-request/token', async (route) => {
        await route.fulfill(apiError(503, 'Account request service is not configured'));
      });

      await page.goto('/features/request-account');

      await expect(page.locator(selectors.accountRequest.qrError)).toBeVisible({ timeout: 15000 });
      await expect(page.locator(selectors.accountRequest.qrImage)).toHaveCount(0);
    });
  });

  test.describe('Mobile layout', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test.beforeEach(async ({ page }) => {
      await mockHiveApi(page);
    });

    test('home page should not scroll horizontally', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expectNoHorizontalOverflow(page);
    });

    test('request account page should not scroll horizontally', async ({ page }) => {
      await mockTokenEndpoint(page);

      await page.goto('/features/request-account');
      await expect(page.locator(selectors.accountRequest.qrImage)).toBeVisible({ timeout: 15000 });

      await expectNoHorizontalOverflow(page);
    });

    test('create account page should not scroll horizontally in any state', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });
      await mockClaimEndpoint(page);

      await openCreateAccountPage(page);
      await expectNoHorizontalOverflow(page);

      await fillAccountName(page, NEW_ACCOUNT_NAME);
      await page.locator(selectors.accountRequest.methodPassword).click();
      await expect(page.locator(selectors.accountRequest.passwordInput)).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.locator(selectors.accountRequest.passwordInput).fill(STRONG_PASSWORD);
      await page.locator(selectors.accountRequest.passwordRepeatInput).fill(STRONG_PASSWORD);
      await page.locator(selectors.accountRequest.passwordSubmit).click();
      await expect(page.locator(selectors.accountRequest.success)).toBeVisible({ timeout: 20000 });
      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe('Create account page', () => {

    test.beforeEach(async ({ page }) => {
      await mockHiveApi(page);
    });

    test('should show the invalid link state when the token is missing', async ({ page }) => {
      await page.goto('/features/create-account');

      await expect(page.locator(selectors.accountRequest.tokenInvalid)).toBeVisible({ timeout: 15000 });
    });

    test('should show the invalid link state for an expired token', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: false, reason: 'invalid' });

      await page.goto(CREATE_ACCOUNT_URL);

      await expect(page.locator(selectors.accountRequest.tokenInvalid)).toBeVisible({ timeout: 15000 });
      await expect(page.locator(selectors.accountRequest.form)).toHaveCount(0);
    });

    test('should show the already used state for a claimed token', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: false, reason: 'claimed' });

      await page.goto(CREATE_ACCOUNT_URL);

      await expect(page.locator(selectors.accountRequest.tokenClaimed)).toBeVisible({ timeout: 15000 });
    });

    test('should show the form with all registration methods for a valid token', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });

      await openCreateAccountPage(page);

      await expect(page.locator(selectors.accountRequest.methodGoogle)).toBeVisible();
      await expect(page.locator(selectors.accountRequest.methodMetamask)).toBeVisible();
      await expect(page.locator(selectors.accountRequest.methodPassword)).toBeVisible();

      // The safety explanation for the Google option is visible right away
      await expect(page.locator(selectors.accountRequest.googleSafetyNote)).toBeVisible();

      // Methods stay locked until a valid account name is entered
      await expect(page.locator(selectors.accountRequest.methodPassword)).toBeDisabled();
    });

    test('should keep MetaMask unavailable when the extension is not detected', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });

      await openCreateAccountPage(page);
      await fillAccountName(page, NEW_ACCOUNT_NAME);

      await expect(page.locator(selectors.accountRequest.methodMetamask)).toBeDisabled();
      await expect(page.locator(selectors.accountRequest.methodGoogle)).toBeEnabled();
    });

    test('should redirect to Google sign-in right after choosing Google without a session', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });
      await page.route('**/api/auth/google/status', async (route) => {
        await route.fulfill(jsonResponse(200, { authenticated: false, user: null }));
      });
      await page.route('**/api/auth/google/login**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body data-testid="google-login-stub">Google</body></html>' });
      });

      await openCreateAccountPage(page);
      await fillAccountName(page, NEW_ACCOUNT_NAME);
      await page.locator(selectors.accountRequest.methodGoogle).click();

      await page.waitForURL(/\/api\/auth\/google\/login\?returnUrl=/, { timeout: 15000 });

      const returnUrl = new URL(page.url()).searchParams.get('returnUrl') ?? '';
      expect(returnUrl).toBe(CREATE_ACCOUNT_URL);
    });

    test('should resume the Google registration automatically after returning from Google sign-in', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });

      // Stateful Google session: signed out until the login endpoint is hit, signed in afterwards
      let signedIn = false;
      await page.route('**/api/auth/google/status', async (route) => {
        await route.fulfill(jsonResponse(200, { authenticated: signedIn, user: signedIn ? { email: 'newcomer@example.com' } : null }));
      });
      await page.route('**/api/auth/google/login**', async (route) => {
        signedIn = true;
        const returnUrl = new URL(route.request().url()).searchParams.get('returnUrl') ?? '/';
        const target = new URL(returnUrl, 'http://localhost');
        target.searchParams.set('auth', 'success');
        await route.fulfill({ status: 302, headers: { Location: `${target.pathname}${target.search}` } });
      });
      await page.route('**/api/google-drive/verify-auth', async (route) => {
        await route.fulfill(jsonResponse(200, { authenticated: true, valid: true }));
      });
      await page.route('**/api/google-drive/check-wallet-file', async (route) => {
        await route.fulfill(jsonResponse(200, { exists: false, fileId: null }));
      });

      await openCreateAccountPage(page);
      await fillAccountName(page, NEW_ACCOUNT_NAME);
      await page.locator(selectors.accountRequest.methodGoogle).click();

      // Back from Google: the recovery password dialog must open on its own, with the token kept in the URL
      await expect(page.locator(selectors.accountRequest.recoveryDialog)).toBeVisible({ timeout: 25000 });
      await expect(page.locator(selectors.accountRequest.nameInput)).toHaveValue(NEW_ACCOUNT_NAME);

      const url = new URL(page.url());
      expect(url.searchParams.get('token')).toBe(TEST_TOKEN);
      expect(url.searchParams.get('auth')).toBeNull();
    });

    test('should ask for a recovery password when Google is connected but no wallet file exists', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });
      await page.route('**/api/auth/google/status', async (route) => {
        await route.fulfill(jsonResponse(200, { authenticated: true, user: { email: 'newcomer@example.com' } }));
      });
      await page.route('**/api/google-drive/verify-auth', async (route) => {
        await route.fulfill(jsonResponse(200, { authenticated: true, valid: true }));
      });
      await page.route('**/api/google-drive/check-wallet-file', async (route) => {
        await route.fulfill(jsonResponse(200, { exists: false, fileId: null }));
      });

      await openCreateAccountPage(page);
      await fillAccountName(page, NEW_ACCOUNT_NAME);
      await page.locator(selectors.accountRequest.methodGoogle).click();

      const dialog = page.locator(selectors.accountRequest.recoveryDialog);
      await expect(dialog).toBeVisible({ timeout: 15000 });
      await expect(page.locator(selectors.accountRequest.recoverySubmit)).toBeDisabled();

      await page.locator(selectors.accountRequest.recoveryPasswordInput).fill(STRONG_PASSWORD);
      await page.locator(selectors.accountRequest.recoveryPasswordRepeatInput).fill(`${STRONG_PASSWORD}-typo`);
      await expect(page.locator(selectors.accountRequest.recoverySubmit)).toBeDisabled();

      await page.locator(selectors.accountRequest.recoveryCancel).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator(selectors.accountRequest.form)).toBeVisible();
      await expect(page.locator(selectors.accountRequest.methodGoogle)).toBeEnabled();
    });

    test('should reveal password fields only after choosing the password method', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });

      await openCreateAccountPage(page);

      await fillAccountName(page, NEW_ACCOUNT_NAME);
      await expect(page.locator(selectors.accountRequest.passwordPanel)).toHaveCount(0);

      await page.locator(selectors.accountRequest.methodPassword).click();

      await expect(page.locator(selectors.accountRequest.passwordInput)).toBeVisible();
      await expect(page.locator(selectors.accountRequest.passwordRepeatInput)).toBeVisible();
      await expect(page.locator(selectors.accountRequest.passwordSubmit)).toBeDisabled();
    });

    test('should create the account with password derived keys', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });

      let claimBody: Record<string, unknown> | undefined;
      await mockClaimEndpoint(page, (body) => { claimBody = body; });

      await openCreateAccountPage(page);

      const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
      await submitWithPassword(page);

      await expect(page.locator(selectors.accountRequest.success)).toBeVisible({ timeout: 20000 });
      await expect(page.locator(selectors.accountRequest.successName)).toHaveText(`@${NEW_ACCOUNT_NAME}`);
      await expect(page.locator(selectors.accountRequest.downloadAuthority)).toBeVisible();

      // The authority data file is handed over automatically for password based registrations
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(`${NEW_ACCOUNT_NAME}-authority-data.json`);

      expect(claimBody).toBeDefined();
      expect(claimBody).toMatchObject({ token: TEST_TOKEN, accountName: NEW_ACCOUNT_NAME, method: 'password' });

      const publicKeys = claimBody!.publicKeys as Record<string, string>;
      for (const role of ['owner', 'active', 'posting', 'memo'])
        expect(publicKeys[role]).toMatch(/^STM[1-9A-HJ-NP-Za-km-z]{50}$/);
    });

    test('should return to the form and show the backend rejection when the claim fails', async ({ page }) => {
      await mockVerifyEndpoint(page, { valid: true });
      await page.route('**/api/account-request/claim', async (route) => {
        await route.fulfill(apiError(409, `Account @${NEW_ACCOUNT_NAME} has already been requested`));
      });

      await openCreateAccountPage(page);
      await submitWithPassword(page);

      const toast = page.locator(selectors.common.toast).first();
      await expect(toast).toBeVisible({ timeout: 20000 });
      await expect(toast).toContainText('already been requested');
      await expect(page.locator(selectors.accountRequest.form)).toBeVisible();
      await expect(page.locator(selectors.accountRequest.nameInput)).toHaveValue(NEW_ACCOUNT_NAME);
      await expect(page.locator(selectors.accountRequest.success)).toHaveCount(0);
    });

    test('should show the already used state when a failed request used the token up', async ({ page }) => {
      // The backend stores the token before creating the account - a creation failure leaves it used
      let tokenUsed = false;
      await mockVerifyEndpoint(page, () => tokenUsed ? { valid: false, reason: 'claimed' } : { valid: true });
      await page.route('**/api/account-request/claim', async (route) => {
        tokenUsed = true;
        await route.fulfill(apiError(500, 'The account request could not be processed - please try again later'));
      });

      await openCreateAccountPage(page);
      await submitWithPassword(page);

      const toast = page.locator(selectors.common.toast).first();
      await expect(toast).toBeVisible({ timeout: 20000 });
      await expect(toast).toContainText('could not be processed');
      await expect(page.locator(selectors.accountRequest.tokenClaimed)).toBeVisible({ timeout: 15000 });
      await expect(page.locator(selectors.accountRequest.form)).toHaveCount(0);
    });

    test('should keep showing the created account with its public keys after a page reload', async ({ page }) => {
      // Once used, the backend only reports the token as claimed - the success screen has to come back from this tab's storage
      let claimBody: Record<string, unknown> | undefined;
      await mockVerifyEndpoint(page, () => claimBody ? { valid: false, reason: 'claimed' } : { valid: true });
      await mockClaimEndpoint(page, (body) => { claimBody = body; });

      await openCreateAccountPage(page);
      await submitWithPassword(page);

      await expect(page.locator(selectors.accountRequest.success)).toBeVisible({ timeout: 20000 });
      await expect(page.locator(selectors.accountRequest.downloadAuthority)).toBeVisible();

      await page.reload();

      await expect(page.locator(selectors.accountRequest.success)).toBeVisible({ timeout: 15000 });
      await expect(page.locator(selectors.accountRequest.successName)).toHaveText(`@${NEW_ACCOUNT_NAME}`);
      await expect(page.locator(selectors.accountRequest.tokenClaimed)).toHaveCount(0);
      await expect(page.locator(selectors.accountRequest.form)).toHaveCount(0);

      // Private keys never leave the session that generated them - only the public keys are remembered
      await expect(page.locator(selectors.accountRequest.downloadAuthority)).toHaveCount(0);
      await page.locator(selectors.accountRequest.detailsToggle).click();
      const keys = page.locator(selectors.accountRequest.detailsKeys);
      for (const key of Object.values(claimBody!.publicKeys as Record<string, string>))
        await expect(keys).toContainText(key);
    });
  });
});
