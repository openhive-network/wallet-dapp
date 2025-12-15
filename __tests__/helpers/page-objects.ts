/**
 * Page Object Models
 *
 * Reusable page abstractions for consistent test interactions.
 * Uses actual selectors from the wallet-dapp UI.
 */

import type { Page, Locator} from '@playwright/test';
import { expect } from '@playwright/test';

import * as selectors from './selectors';

// ===========================================
// Base Page
// ===========================================

export class BasePage {
  constructor (protected page: Page) {}

  async navigate (path: string = '/') {
    await this.page.goto(path);
  }

  async waitForPageLoad () {
    await this.page.waitForLoadState('networkidle');
  }

  async getToastMessage (): Promise<string | null> {
    const toast = this.page.locator(selectors.common.toast).first();
    if (await toast.isVisible().catch(() => false))
      return toast.textContent();

    return null;
  }

  async waitForToast (expectedText?: string, timeout = 10000) {
    const toast = this.page.locator(selectors.common.toast).first();
    await expect(toast).toBeVisible({ timeout });
    if (expectedText)
      await expect(toast).toContainText(expectedText);

    return toast;
  }

  async waitForLoading () {
    const spinner = this.page.locator(selectors.common.loadingSpinner);
    const skeleton = this.page.locator(selectors.common.loadingSkeleton);
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await skeleton.first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }

  async closeDialog () {
    const closeBtn = this.page.locator(selectors.common.closeButton).or(
      this.page.locator(selectors.common.dialogCloseButton)
    );
    if (await closeBtn.first().isVisible().catch(() => false))
      await closeBtn.first().click();

  }
}

// ===========================================
// Home Page
// ===========================================

export class HomePage extends BasePage {
  // Locators using actual UI selectors
  get connectWalletButton (): Locator {
    return this.page.locator(selectors.walletConnection.connectButton).or(
      this.page.locator(selectors.accountDisplay.connectWalletButton)
    );
  }

  get connectWalletCard (): Locator {
    return this.page.locator(selectors.accountDisplay.connectWalletCard);
  }

  get accountDetailsCard (): Locator {
    return this.page.locator(selectors.accountDisplay.accountDetailsCard);
  }

  get accountName (): Locator {
    return this.page.locator(selectors.accountDisplay.accountName);
  }

  // Actions
  async goto () {
    await this.navigate('/');
    await this.waitForPageLoad();
  }

  async clickConnectWallet () {
    await this.connectWalletButton.first().click();
  }

  async isLoggedIn (): Promise<boolean> {
    return this.accountDetailsCard.isVisible().catch(() => false);
  }

  async isConnected (): Promise<boolean> {
    return this.isLoggedIn();
  }

  async getDisplayedAccountName (): Promise<string | null> {
    if (await this.accountName.first().isVisible().catch(() => false))
      return this.accountName.first().textContent();

    return null;
  }
}

// ===========================================
// Wallet Select Modal
// ===========================================

export class WalletSelectModal extends BasePage {
  get modal (): Locator {
    return this.page.locator(selectors.walletConnection.walletSelectModal);
  }

  get keychainOption (): Locator {
    return this.page.locator(selectors.walletConnection.keychainOption);
  }

  get peakvaultOption (): Locator {
    return this.page.locator(selectors.walletConnection.peakVaultOption);
  }

  get metamaskOption (): Locator {
    return this.page.locator(selectors.walletConnection.metamaskOption);
  }

  get googleDriveOption (): Locator {
    return this.page.locator(selectors.walletConnection.googleDriveOption);
  }

  get htmOption (): Locator {
    return this.page.locator(selectors.walletConnection.htmOption);
  }

  get closeButton (): Locator {
    return this.page.locator(selectors.walletConnection.closeButton).or(
      this.page.locator(selectors.common.closeButton)
    );
  }

  async waitForOpen () {
    await this.page.locator(selectors.walletConnection.walletSelectTitle).waitFor({ state: 'visible', timeout: 10000 });
  }

  async waitForClose () {
    await this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async selectKeychain () {
    await this.keychainOption.click();
  }

  async selectPeakVault () {
    await this.peakvaultOption.click();
  }

  async selectMetaMask () {
    await this.metamaskOption.click();
  }

  async selectGoogleDrive () {
    await this.googleDriveOption.click();
  }

  async selectHTM () {
    await this.htmOption.click();
  }

  async close () {
    await this.page.keyboard.press('Escape');
    await this.waitForClose();
  }

  async waitForKeychainConnect () {
    await this.page.locator(selectors.walletConnection.keychainTitle).waitFor({ state: 'visible', timeout: 10000 });
  }

  async selectAuthority (authority: 'Posting' | 'Active' | 'Memo') {
    await this.page.locator(selectors.walletConnection.authoritySelect).click();
    const option = authority === 'Posting' ? selectors.walletConnection.authorityPosting :
      authority === 'Active' ? selectors.walletConnection.authorityActive :
        selectors.walletConnection.authorityMemo;
    await this.page.locator(option).click();
  }

  async clickKeychainConnect () {
    const btn = this.page.locator('button:has-text("Connect")');
    await btn.click();
  }

  async waitForSuccess () {
    await this.page.locator(selectors.walletConnection.successMessage).waitFor({ state: 'visible', timeout: 10000 });
  }

  async closeSuccessModal () {
    await this.page.locator(selectors.walletConnection.closeButton).click();
  }

  async isWalletAvailable (wallet: 'keychain' | 'peakvault' | 'metamask' | 'google-drive' | 'htm'): Promise<boolean> {
    const optionMap = {
      'keychain': this.keychainOption,
      'peakvault': this.peakvaultOption,
      'metamask': this.metamaskOption,
      'google-drive': this.googleDriveOption,
      'htm': this.htmOption
    };
    const option = optionMap[wallet];
    return option.isVisible().catch(() => false);
  }
}

// Alias for backward compatibility
export { WalletSelectModal as WalletModal };

// ===========================================
// Recovery Password Dialog
// ===========================================

export class RecoveryPasswordDialog extends BasePage {
  get dialog (): Locator {
    return this.page.locator(selectors.common.dialog);
  }

  get passwordInput (): Locator {
    return this.page.locator('#password').or(this.page.locator('input[type="password"]'));
  }

  get submitButton (): Locator {
    return this.page.locator('button:has-text("Submit")').or(this.page.locator('button:has-text("Login")'));
  }

  get cancelButton (): Locator {
    return this.page.locator('button:has-text("Cancel")');
  }

  get errorMessage (): Locator {
    return this.page.locator(selectors.common.errorMessage);
  }

  async waitForOpen () {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForClose () {
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async enterPassword (password: string) {
    await this.passwordInput.fill(password);
  }

  async submit () {
    await this.submitButton.click();
  }

  async cancel () {
    await this.cancelButton.click();
    await this.waitForClose();
  }

  async submitPassword (password: string) {
    await this.enterPassword(password);
    await this.submit();
  }
}

// ===========================================
// Token List Page
// ===========================================

export class TokenListPage extends BasePage {
  get pageTitle (): Locator {
    return this.page.locator(selectors.tokenList.pageTitle);
  }

  get tokenList (): Locator {
    return this.page.locator(selectors.tokenList.tokenGrid);
  }

  get tokenCards (): Locator {
    return this.page.locator(selectors.tokenList.tokenCard);
  }

  get searchInput (): Locator {
    return this.page.locator(selectors.tokenList.searchInput);
  }

  get createTokenButton (): Locator {
    return this.page.locator(selectors.tokenList.createTokenButton);
  }

  get loadingSpinner (): Locator {
    return this.page.locator(selectors.common.loadingSkeleton);
  }

  get refreshButton (): Locator {
    return this.page.locator(selectors.tokenList.refreshButton);
  }

  get emptyState (): Locator {
    return this.page.locator(selectors.tokenList.emptyState);
  }

  get loadMoreButton (): Locator {
    return this.page.locator(selectors.tokenList.loadMoreButton);
  }

  async goto () {
    await this.navigate('/tokens/list');
    await this.waitForPageLoad();
  }

  async waitForTokensLoaded () {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForLoading();
  }

  async searchToken (query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch () {
    await this.searchInput.clear();
  }

  async getTokenCount (): Promise<number> {
    return this.tokenCards.count();
  }

  async clickToken (index: number) {
    const links = this.page.locator(selectors.tokenList.tokenCardLink);
    await links.nth(index).click();
  }

  async clickCreateToken () {
    await this.createTokenButton.click();
  }

  async clickRefresh () {
    await this.refreshButton.click();
  }

  async loadMore () {
    if (await this.loadMoreButton.isVisible().catch(() => false))
      await this.loadMoreButton.click();

  }

  async hasEmptyState (): Promise<boolean> {
    return this.emptyState.isVisible().catch(() => false);
  }
}

// Alias for backward compatibility
export { TokenListPage as TokensPage };

// ===========================================
// Token Detail Page
// ===========================================

export class TokenDetailPage extends BasePage {
  get tokenInfo (): Locator {
    return this.page.locator('.rounded-xl.border.bg-card');
  }

  get tokenName (): Locator {
    return this.page.locator('h1, .text-2xl.font-bold');
  }

  get tokenSymbol (): Locator {
    return this.page.locator('.text-lg.truncate');
  }

  get transferButton (): Locator {
    return this.page.locator('button:has-text("Transfer")').or(
      this.page.locator('button:has(svg[d*="send"])')
    );
  }

  get stakeButton (): Locator {
    return this.page.locator('button:has-text("Stake")');
  }

  async goto (assetNum: string) {
    await this.navigate(`/tokens/token?asset-num=${assetNum}`);
    await this.waitForPageLoad();
  }

  async clickTransfer () {
    await this.transferButton.click();
  }

  async clickStake () {
    await this.stakeButton.click();
  }
}

// ===========================================
// Send Transfer Card
// ===========================================

export class SendTransferCard extends BasePage {
  get card (): Locator {
    return this.page.locator(selectors.common.dialog).or(
      this.page.locator('.rounded-xl.border.bg-card')
    );
  }

  get recipientInput (): Locator {
    return this.page.locator(selectors.tokenTransfer.recipientInput).or(
      this.page.locator('input[placeholder*="recipient"]').or(
        this.page.locator('input[placeholder*="account"]')
      )
    );
  }

  get amountInput (): Locator {
    return this.page.locator(selectors.tokenTransfer.amountInput).or(
      this.page.locator('input[type="number"]')
    );
  }

  get memoInput (): Locator {
    return this.page.locator('#memo').or(
      this.page.locator('textarea[placeholder*="memo"]').or(
        this.page.locator('input[placeholder*="memo"]')
      )
    );
  }

  get tokenSelect (): Locator {
    return this.page.locator('[role="combobox"]');
  }

  get sendButton (): Locator {
    return this.page.locator('button:has-text("Send")').or(
      this.page.locator('button:has-text("Transfer")')
    );
  }

  get maxButton (): Locator {
    return this.page.locator('button:has-text("Max")').or(
      this.page.locator('button:has-text("MAX")')
    );
  }

  async fillTransfer (recipient: string, amount: string, memo?: string) {
    await this.recipientInput.first().fill(recipient);
    await this.amountInput.first().fill(amount);
    if (memo)
      await this.memoInput.first().fill(memo);

  }

  async selectToken (tokenSymbol: string) {
    await this.tokenSelect.click();
    await this.page.locator(`[role="option"]:has-text("${tokenSymbol}")`).click();
  }

  async clickMax () {
    await this.maxButton.click();
  }

  async submit () {
    await this.sendButton.first().click();
  }
}

// ===========================================
// Settings Page
// ===========================================

export class SettingsPage extends BasePage {
  get pageTitle (): Locator {
    return this.page.locator(selectors.settings.pageTitle);
  }

  get connectGoogleCard (): Locator {
    return this.page.locator(selectors.settings.connectGoogleCard);
  }

  get connectGoogleButton (): Locator {
    return this.page.locator(selectors.settings.connectGoogleButton);
  }

  get privateKeyInput (): Locator {
    return this.page.locator(selectors.settings.privateKeyInput);
  }

  get saveButton (): Locator {
    return this.page.locator(selectors.settings.saveButton);
  }

  get googleDriveSection (): Locator {
    return this.page.locator('[data-testid="google-drive-section"]').or(
      this.page.locator('text=Google Drive')
    );
  }

  async goto () {
    await this.navigate('/settings');
    await this.waitForPageLoad();
  }

  async isGoogleConnected (): Promise<boolean> {
    // If connect card is visible, not connected
    return !(await this.connectGoogleCard.isVisible().catch(() => false));
  }

  async clickConnectGoogle () {
    await this.connectGoogleButton.click();
  }

  async fillPrivateKey (key: string) {
    await this.privateKeyInput.fill(key);
  }

  async clickSave () {
    await this.saveButton.click();
  }
}

// ===========================================
// Navigation Components
// ===========================================

export class AppNavigation extends BasePage {
  get sidebar (): Locator {
    return this.page.locator(selectors.layout.sidebar);
  }

  get header (): Locator {
    return this.page.locator(selectors.layout.header);
  }

  get accountSwitcher (): Locator {
    return this.page.locator(selectors.accountDisplay.accountSwitcher);
  }

  get homeLink (): Locator {
    return this.page.locator(selectors.navigation.home);
  }

  get tokensLink (): Locator {
    return this.page.locator(selectors.navigation.tokensList);
  }

  get settingsLink (): Locator {
    return this.page.locator(selectors.navigation.googleDriveWallet);
  }

  get sidebarTrigger (): Locator {
    return this.page.locator(selectors.layout.sidebarTrigger);
  }

  async openSidebar () {
    if (await this.sidebarTrigger.isVisible().catch(() => false))
      await this.sidebarTrigger.click();

  }

  async goToHome () {
    await this.homeLink.click();
    await this.waitForPageLoad();
  }

  async goToTokens () {
    await this.tokensLink.click();
    await this.waitForPageLoad();
  }

  async goToSettings () {
    await this.settingsLink.click();
    await this.waitForPageLoad();
  }

  async openAccountSwitcher () {
    await this.accountSwitcher.click();
  }

  async navigateToMemoEncryption () {
    await this.page.locator(selectors.navigation.memoEncryption).click();
    await this.waitForPageLoad();
  }

  async navigateToTransactionSigning () {
    await this.page.locator(selectors.navigation.transactionSigning).click();
    await this.waitForPageLoad();
  }

  async navigateToRegisterHTMAccount () {
    await this.page.locator(selectors.navigation.registerHtmAccount).click();
    await this.waitForPageLoad();
  }

  async navigateToMyHTMAccount () {
    await this.page.locator(selectors.navigation.myHtmAccount).click();
    await this.waitForPageLoad();
  }
}

// ===========================================
// HTM Registration Page
// ===========================================

export class HTMRegistrationPage extends BasePage {
  get optionsCard (): Locator {
    return this.page.locator(selectors.htmRegistration.optionsCard);
  }

  get registerNewButton (): Locator {
    return this.page.locator(selectors.htmRegistration.registerNewButton);
  }

  get loginButton (): Locator {
    return this.page.locator(selectors.htmRegistration.loginButton);
  }

  async goto () {
    await this.navigate('/tokens/register-account');
    await this.waitForPageLoad();
  }

  async clickRegisterNew () {
    await this.registerNewButton.click();
  }

  async clickLogin () {
    await this.loginButton.click();
  }

  async fillRegistrationForm (options: {
    displayName: string;
    password: string;
    about?: string;
  }) {
    await this.page.locator(selectors.htmRegistration.displayNameInput).fill(options.displayName);
    await this.page.locator(selectors.htmRegistration.walletPassword).fill(options.password);
    await this.page.locator(selectors.htmRegistration.walletPasswordRepeat).fill(options.password);

    if (options.about)
      await this.page.locator(selectors.htmRegistration.aboutTextarea).fill(options.about);

  }

  async generateKeys () {
    await this.page.locator(selectors.htmRegistration.generateButton).click();
  }

  async confirmDownload () {
    await this.page.locator(selectors.htmRegistration.confirmCheckbox).click();
  }

  async submitRegistration () {
    await this.page.locator(selectors.htmRegistration.registerButton).click();
  }

  async fillLoginPassword (password: string) {
    await this.page.locator(selectors.htmRegistration.passwordInput).fill(password);
  }

  async submitLogin () {
    await this.page.locator(selectors.htmRegistration.loginSubmitButton).click();
  }
}

// ===========================================
// My Balance Page
// ===========================================

export class MyBalancePage extends BasePage {
  get pageTitle (): Locator {
    return this.page.locator(selectors.myBalance.pageTitle);
  }

  get refreshButton (): Locator {
    return this.page.locator(selectors.myBalance.refreshButton);
  }

  get balanceTable (): Locator {
    return this.page.locator(selectors.myBalance.balanceTable);
  }

  async goto () {
    await this.navigate('/tokens/my-balance');
    await this.waitForPageLoad();
  }

  async waitForBalancesLoad () {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForLoading();
  }

  async clickRefresh () {
    await this.refreshButton.click();
  }

  async getBalanceRows (): Promise<Locator> {
    return this.page.locator('tbody tr');
  }

  async hasNoBalances (): Promise<boolean> {
    return this.page.locator(selectors.myBalance.noBalances).isVisible().catch(() => false);
  }
}
