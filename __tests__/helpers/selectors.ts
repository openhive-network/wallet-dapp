/**
 * UI Selectors
 *
 * Centralized selectors for all UI elements based on actual app structure.
 * Update these when UI changes to fix tests in one place.
 */

// ===========================================
// Navigation & Layout
// ===========================================

export const layout = {
  sidebar: '[data-sidebar="sidebar"]',
  sidebarTrigger: '[data-sidebar="trigger"]',
  mainContent: 'main.bg-background',
  header: 'header',
  logo: 'a[href="/"] img[src="/icon.svg"]',
  appTitle: 'text=Hive Bridge'
};

export const navigation = {
  home: 'button:has-text("Home")',
  tokensList: 'button:has-text("Tokens List")',
  myHtmAccount: 'button:has-text("My HTM Account")',
  registerHtmAccount: 'button:has-text("Register HTM Account")',
  googleDriveWallet: 'button:has-text("Google Drive Wallet")',
  memoEncryption: 'button:has-text("Memo encryption")',
  transactionSigning: 'button:has-text("Transaction signing")',
  requestAccountCreation: 'button:has-text("Request Account Creation")',
  processAccountCreation: 'button:has-text("Process Account Creation")',
  processAuthorityUpdate: 'button:has-text("Process Authority Update")',
  authorizeDapp: 'button:has-text("Authorize dApp")'
};

// ===========================================
// Wallet Connection
// ===========================================

export const walletConnection = {
  // Header connect button
  connectButton: 'button:has-text("Connect")',

  // Wallet selection modal
  walletSelectModal: '.onboarding-container, aside.fixed.inset-0.z-20',
  walletSelectTitle: 'text=Select wallet',

  // Wallet options - scoped to aside (modal) to avoid sidebar duplicates
  keychainOption: 'aside button:has-text("Keychain")',
  peakVaultOption: 'aside button:has-text("PeakVault")',
  metamaskOption: 'aside button:has-text("Metamask")',
  googleDriveOption: 'aside button:has-text("Google Drive"):has-text("Store your wallet")',
  htmOption: 'aside button:has-text("Hive Token Machine")',

  // Keychain connect
  keychainTitle: 'text=Keychain Connector',
  authoritySelect: '[role="combobox"]',
  authorityPosting: '[role="option"]:has-text("Posting")',
  authorityActive: '[role="option"]:has-text("Active")',
  authorityMemo: '[role="option"]:has-text("Memo")',
  keychainConnectBtn: 'button.border-\\[\\#e31337\\]:has-text("Connect")',

  // PeakVault connect
  peakVaultTitle: 'text=PeakVault Connector',
  peakVaultConnectBtn: 'button:has-text("Connect")',

  // MetaMask connect
  metamaskTitle: 'text=Metamask Connector',

  // HTM connect
  htmTitle: 'text=HTM Connector',
  htmOperationalKey: '#operationalKey',
  htmManagementKey: '#managementKey',
  htmPassword: '#password',
  htmRepeatPassword: '#repeatPassword',
  htmConnectBtn: 'button.border-\\[\\#FBA510\\]:has-text("Connect")',

  // Success
  successMessage: 'text=Wallet selected!',
  closeButton: 'button:has-text("Close")',

  // Disconnect
  disconnectButton: 'button[size="icon"] path[style*="destructive"], button:has(svg[class*="destructive"])'
};

// ===========================================
// Account Display
// ===========================================

export const accountDisplay = {
  // When not connected
  connectWalletCard: 'text=Connect your account',
  connectWalletDescription: 'text=Connect to wallet of your choice',
  connectWalletButton: 'button:has-text("Connect your wallet now")',

  // When connected
  accountDetailsCard: 'text=Account details',
  accountAvatar: '.rounded-xl.w-20.h-20, .w-8.h-8.rounded-full',
  accountName: '.font-bold.max-w-\\[150px\\], .font-semibold',

  // Balances
  balancesSection: 'text=Balances',
  hiveBalance: 'text=HIVE',
  hbdBalance: 'text=HBD',
  hivePower: 'text=HP',

  // Manabars
  manabarsSection: 'text=Manabars',
  upvoteMana: 'text=Upvote',
  downvoteMana: 'text=Downvote',
  rcMana: 'text=RC',

  // Account switcher
  accountSwitcher: '.inline-flex.items-center.relative',
  switchAccountBtn: 'button.rounded-full.h-8.w-8'
};

// ===========================================
// Token List Page
// ===========================================

export const tokenList = {
  pageTitle: 'h1:has-text("Tokens List")',
  pageDescription: 'text=Browse all registered tokens on Hive Token Machine',

  // Actions
  refreshButton: 'button:has-text("Refresh")',
  createTokenButton: 'button:has-text("Create Token")',

  // Search
  searchInput: 'input[placeholder*="Search tokens"]',
  clearSearchButton: 'svg.cursor-pointer',

  // Filters
  showMyTokensCheckbox: '#show-my-tokens',
  showMyTokensLabel: 'label[for="show-my-tokens"]',

  // Token grid
  tokenGrid: '.grid.grid-cols-1',
  tokenCard: '.rounded-xl.border.bg-card',
  tokenCardLink: 'a[href^="/tokens/token"]',
  tokenSymbol: '.text-lg.truncate',
  tokenDescription: '.text-muted-foreground.line-clamp-2',
  nftBadge: 'text=NFT',
  stakedBadge: 'text=staked',

  // Pagination
  loadMoreButton: 'button:has-text("Load More")',

  // Empty state
  emptyState: 'text=No Tokens Found',

  // Loading
  loadingSkeleton: '.animate-pulse'
};

// ===========================================
// Token Transfer
// ===========================================

export const tokenTransfer = {
  dialog: '[role="dialog"]',
  dialogTitle: 'text=Transfer',

  recipientInput: 'input[placeholder*="recipient"], #receiver',
  amountInput: '#token-amount, input[type="number"]',
  memoInput: '#memo, textarea[placeholder*="memo"]',

  sendButton: 'button:has-text("Send"), button:has-text("Transfer")',
  cancelButton: 'button:has-text("Cancel")',

  // Validation
  insufficientBalance: 'text=insufficient, text=Insufficient',
  invalidRecipient: 'text=invalid, text=Invalid'
};

// ===========================================
// Token Creation
// ===========================================

export const tokenCreation = {
  pageTitle: 'h1:has-text("Create Token")',

  // Form fields
  symbolInput: '#symbol, input[name="symbol"]',
  nameInput: '#name, input[name="name"]',
  precisionInput: '#precision, input[name="precision"]',
  maxSupplyInput: '#maxSupply, input[name="maxSupply"]',
  descriptionInput: '#description, textarea[name="description"]',

  // Options
  nftCheckbox: '#nft, input[name="nft"]',
  stakableCheckbox: '#stakable, input[name="stakable"]',

  // Submit
  createButton: 'button:has-text("Create Token"), button:has-text("Create")',

  // Validation
  validationError: '.text-destructive, .text-red-500'
};

// ===========================================
// My Balance Page
// ===========================================

export const myBalance = {
  pageTitle: 'h1:has-text("Account Balances")',

  // Summary cards
  createdTokens: 'text=Created Tokens',
  ownedTokens: 'text=Owned Tokens',
  nftCollections: 'text=NFT Collections',
  stakedTokens: 'text=Staked Tokens',

  // Table
  balanceTable: 'table',
  tableHeader: 'thead',
  tableBody: 'tbody',
  tableRow: 'tr',
  assetColumn: 'th:has-text("Asset")',
  balancesColumn: 'th:has-text("Balances")',

  // Actions
  refreshButton: 'button:has-text("Refresh")',
  transferButton: 'button[title="Transfer"], button:has(svg[d*="send"])',
  stakeButton: 'button[title="Stake"]',
  unstakeButton: 'button[title="Unstake"]',

  // Empty state
  noBalances: 'text=No tokens, text=No balances'
};

// ===========================================
// HTM Registration
// ===========================================

export const htmRegistration = {
  // Options
  optionsCard: 'text=HTM Access Required',
  registerNewButton: 'button:has-text("Register New HTM Account")',
  loginButton: 'button:has-text("Login to Existing HTM Account")',

  // Registration form
  displayNameInput: '#account-name',
  aboutTextarea: '#account-about',
  websiteInput: '#account-website',
  profileImageInput: '#account-profile-image',
  walletPassword: '#wallet-password',
  walletPasswordRepeat: '#wallet-password-repeat',

  // Generate keys
  generateButton: 'button:has-text("Generate")',

  // Confirm
  confirmCheckbox: '#confirm-download',
  registerButton: 'button:has-text("Register HTM Account")',

  // Login form
  passwordInput: '#password',
  loginSubmitButton: 'button:has-text("Login to HTM"), button:has-text("Connect")',

  // Success
  successCard: 'text=HTM Account Created, text=Login Successful'
};

// ===========================================
// Settings Page
// ===========================================

export const settings = {
  pageTitle: 'h1:has-text("Google Drive Wallet Management")',

  // When not connected
  connectGoogleCard: 'text=Connect Google Drive',
  connectGoogleDescription: 'text=Secure your encrypted keys in Google Drive',
  connectGoogleButton: 'button:has-text("Connect Google Drive")',

  // When connected
  privateKeyInput: '#privateKey',
  saveButton: 'button:has-text("Save")',

  // Loading
  loadingSkeleton: '.space-y-6 .animate-pulse'
};

// ===========================================
// Signing Pages
// ===========================================

export const signing = {
  // Memo encryption
  memoEncryptionTitle: 'h1:has-text("Memo")',
  memoInput: '#memo, textarea',
  encryptButton: 'button:has-text("Encrypt")',
  decryptButton: 'button:has-text("Decrypt")',
  resultOutput: '.font-mono, pre',

  // Transaction signing
  transactionSigningTitle: 'h1:has-text("Sign"), text=Transaction',
  transactionInput: 'textarea',
  signButton: 'button:has-text("Sign")',

  // Authorization
  authorizeDappTitle: 'text=Authorize'
};

// ===========================================
// Common Elements
// ===========================================

export const common = {
  // Dialogs
  dialog: '[role="dialog"]',
  dialogOverlay: '.fixed.inset-0.z-50.bg-black\\/80',
  dialogCloseButton: '[role="dialog"] button:has(.sr-only)',

  // Toasts
  toast: '[data-sonner-toast]',
  toastSuccess: '[data-sonner-toast][data-type="success"]',
  toastError: '[data-sonner-toast][data-type="error"]',

  // Buttons
  submitButton: 'button[type="submit"]',
  cancelButton: 'button:has-text("Cancel")',
  closeButton: 'button:has-text("Close")',
  backButton: 'button:has-text("Back")',

  // Loading
  loadingSpinner: '.animate-spin',
  loadingSkeleton: '.animate-pulse',
  disabled: '[disabled], .opacity-50',

  // Error
  errorMessage: '.text-destructive, .text-red-500',
  errorDialog: '[role="alertdialog"]'
};

// ===========================================
// Account Creation
// ===========================================

export const accountCreation = {
  // Request page
  requestTitle: 'h1:has-text("Request Account Creation")',
  accountNameInput: '#account-name, input[name="accountName"]',
  submitRequestButton: 'button:has-text("Request"), button:has-text("Submit")',

  // Process page
  processTitle: 'h1:has-text("Process Account Creation")',
  approveButton: 'button:has-text("Approve"), button:has-text("Create")',

  // Validation
  accountAvailable: 'text=available, text=Available',
  accountTaken: 'text=taken, text=Taken, text=already exists',
  invalidFormat: 'text=invalid, text=Invalid'
};
