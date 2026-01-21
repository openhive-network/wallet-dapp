/**
 * UI Selectors
 *
 * Centralized selectors for all UI elements.
 * Strategy: data-testid only - no text matching or Tailwind CSS classes.
 * Note: data-testid attributes are stripped in production builds.
 */

// Helper function to create testid selector
const testid = (id: string) => `[data-testid="${id}"]`;

// ===========================================
// Navigation & Layout
// ===========================================

export const layout = {
  sidebar: '[data-sidebar="sidebar"]',
  sidebarTrigger: '[data-sidebar="trigger"]',
  header: 'header'
};

export const navigation = {
  home: '[data-sidebar="menu-button"]:has-text("Home")',
  tokensList: '[data-sidebar="menu-button"]:has-text("Tokens List")',
  myHtmAccount: '[data-sidebar="menu-button"]:has-text("My HTM Account")',
  registerHtmAccount: '[data-sidebar="menu-button"]:has-text("Register HTM Account")',
  googleDriveWallet: '[data-sidebar="menu-button"]:has-text("Google Drive Wallet")',
  memoEncryption: '[data-sidebar="menu-button"]:has-text("Memo encryption")',
  transactionSigning: '[data-sidebar="menu-button"]:has-text("Transaction signing")'
};

// ===========================================
// Wallet Connection
// ===========================================

export const walletConnection = {
  // Header connect button
  connectButton: testid('connect-wallet-btn'),

  // Wallet selection modal
  walletSelectModal: testid('wallet-select-modal'),
  walletSelectTitle: testid('wallet-select-title'),
  walletSelectClose: testid('wallet-select-close'),

  // Wallet options
  keychainOption: testid('wallet-keychain-option'),
  peakVaultOption: testid('wallet-peakvault-option'),
  metamaskOption: testid('wallet-metamask-option'),
  googleDriveOption: testid('wallet-googledrive-option'),
  htmOption: testid('wallet-htm-option'),

  // Keychain connect
  keychainTitle: testid('keychain-connector-title'),
  keychainConnectBtn: testid('keychain-connect-btn'),
  authoritySelect: '[role="combobox"]',
  authorityPosting: '[role="option"]:has-text("Posting")',
  authorityActive: '[role="option"]:has-text("Active")',
  authorityMemo: '[role="option"]:has-text("Memo")',

  // PeakVault connect
  peakVaultTitle: testid('peakvault-connector-title'),
  peakVaultConnectBtn: testid('peakvault-connect-btn'),

  // MetaMask connect
  metamaskTitle: testid('metamask-connector-title'),

  // HTM connect
  htmTitle: testid('htm-connector-title'),
  htmPassword: testid('htm-password'),
  htmRepeatPassword: testid('htm-repeat-password'),

  // Success
  successMessage: testid('wallet-success-message'),
  closeButton: testid('wallet-close-btn'),

  // Disconnect
  disconnectButton: testid('account-disconnect-btn')
};

// ===========================================
// Account Display
// ===========================================

export const accountDisplay = {
  // When not connected
  connectWalletCard: testid('connect-wallet-card'),
  connectWalletButton: testid('connect-wallet-btn'),

  // When connected
  accountDetailsCard: testid('account-details-card'),
  accountName: testid('account-name'),

  // Account switcher
  accountSwitcher: testid('account-switcher'),
  switchAccountBtn: testid('account-switch-btn'),
  disconnectBtn: testid('account-disconnect-btn'),
  connectHtmBtn: testid('account-connect-htm-btn'),
  connectHiveBtn: testid('account-connect-hive-btn')
};

// ===========================================
// Token List Page
// ===========================================

export const tokenList = {
  pageTitle: testid('token-list-title'),
  tokenGrid: testid('token-grid'),
  tokenCard: testid('token-card'),
  tokenCardLink: 'a[href^="/tokens/token"]',
  searchInput: testid('token-search-input'),
  createTokenButton: testid('create-token-btn'),
  refreshButton: testid('token-refresh-btn'),
  loadMoreButton: testid('load-more-btn'),
  emptyState: testid('token-empty-state')
};

// ===========================================
// Token Transfer
// ===========================================

export const tokenTransfer = {
  sendTransferCard: testid('send-transfer-card'),
  receiveTransferCard: testid('receive-transfer-card'),
  htmTransferCard: testid('htm-transfer-card'),

  // Recipient selector (UserSelector component)
  recipientTrigger: testid('htm-transfer-recipient-trigger'),
  recipientSearch: testid('htm-transfer-recipient-search'),

  // Amount input
  amountContainer: testid('token-amount-container'),
  amountInput: testid('token-amount-input'),
  maxAmountBtn: testid('token-amount-max-btn'),

  // Memo
  memoToggle: testid('memo-toggle-btn'),
  memoInput: `${testid('memo-textarea')} textarea`,

  // Buttons
  qrScanBtn: testid('receive-qr-scan-btn'),
  sendButton: testid('receive-send-btn'),
  htmSendButton: testid('htm-transfer-send-btn')
};

// ===========================================
// Token Creation
// ===========================================

export const tokenCreation = {
  form: testid('tokencreate-form'),
  card: testid('tokencreate-card'),
  symbolInput: testid('tokencreate-symbol'),
  nameInput: testid('tokencreate-name'),
  precisionInput: testid('tokencreate-precision'),
  maxSupplyInput: testid('tokencreate-supply'),
  descriptionInput: testid('tokencreate-description'),
  disclaimerCheckbox: testid('tokencreate-disclaimer'),
  createButton: testid('tokencreate-submit-btn')
};

// ===========================================
// My Balance Page
// ===========================================

export const myBalance = {
  pageTitle: testid('my-balance-title'),
  balanceTable: testid('balance-table'),
  refreshButton: testid('balance-refresh-btn'),
  noBalances: testid('no-balances')
};

// ===========================================
// HTM Registration
// ===========================================

export const htmRegistration = {
  optionsCard: testid('htm-options-card'),
  registerNewButton: testid('htm-register-btn'),
  loginButton: testid('htm-login-btn'),
  displayNameInput: '#account-name',
  aboutTextarea: '#account-about',
  walletPassword: '#wallet-password',
  walletPasswordRepeat: '#wallet-password-repeat',
  encryptToggle: testid('htm-encrypt-toggle'),
  htmPassword: testid('htm-password'),
  htmRepeatPassword: testid('htm-repeat-password'),
  generateButton: testid('htm-generate-btn'),
  confirmCheckbox: '#confirm-download',
  registerButton: testid('htm-register-submit-btn'),
  passwordInput: testid('htm-password'),
  loginSubmitButton: testid('htm-login-submit-btn')
};

// ===========================================
// Settings Page
// ===========================================

export const settings = {
  pageTitle: testid('settings-title'),
  connectGoogleCard: testid('google-connect-card'),
  connectGoogleButton: testid('google-connect-btn'),
  privateKeyInput: '#privateKey',
  saveButton: testid('settings-save-btn')
};

// ===========================================
// Signing Pages
// ===========================================

export const signing = {
  signTxCard: testid('sign-tx-card'),
  transactionInput: testid('sign-tx-input'),
  authoritySelect: testid('sign-tx-authority-select'),
  signButton: testid('sign-tx-btn'),
  signTxOutput: testid('sign-tx-output'),
  broadcastButton: testid('sign-tx-broadcast-btn'),
  updateAuthorityCard: testid('update-authority-card'),
  updateAuthorityBtn: testid('update-authority-btn')
};

// ===========================================
// Common Elements
// ===========================================

export const common = {
  // Dialogs
  dialog: '[role="dialog"]',
  dialogCloseButton: testid('dialog-close-btn'),

  // Error dialog
  errorDialog: testid('error-dialog'),
  errorLogBtn: testid('error-log-btn'),
  errorCopyBtn: testid('error-copy-btn'),

  // Recovery password dialog
  recoveryPasswordDialog: testid('recovery-password-dialog'),
  recoveryPasswordInput: testid('recovery-password-input'),
  recoveryPasswordToggle: testid('recovery-password-toggle'),
  recoveryCancelBtn: testid('recovery-cancel-btn'),
  recoverySubmitBtn: testid('recovery-submit-btn'),

  // Account name prompt dialog
  accountPromptDialog: testid('account-prompt-dialog'),
  accountPromptInput: testid('account-prompt-input'),
  accountPromptCancelBtn: testid('account-prompt-cancel-btn'),
  accountPromptSubmitBtn: testid('account-prompt-submit-btn'),

  // Toasts
  toast: '[data-sonner-toast]',

  // Buttons
  closeButton: testid('close-btn'),

  // Loading
  loadingSpinner: '[data-loading="spinner"]',
  loadingSkeleton: '[data-loading="skeleton"]',

  // Error
  errorMessage: testid('error-message')
};

// ===========================================
// Token Staking
// ===========================================

export const tokenStaking = {
  card: testid('stake-card'),
  connectBtn: testid('stake-connect-btn'),
  stakeBtn: testid('stake-btn'),
  unstakeBtn: testid('unstake-btn')
};
