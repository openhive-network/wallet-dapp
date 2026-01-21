/**
 * Test Fixtures - Test Accounts
 *
 * Pre-configured test accounts for E2E testing
 * These accounts should exist on the testnet (https://api.fake.openhive.network)
 */

export interface TestAccount {
  name: string;
  displayName?: string;
  postingKey?: string;
  activeKey?: string;
  memoKey?: string;
  ownerKey?: string;
  description: string;
}

// ===========================================
// Hive Testnet Accounts
// ===========================================

/**
 * Primary test account with full key access
 * Use for: transfers, signing, wallet operations
 */
export const primaryTestAccount: TestAccount = {
  name: 'initminer',
  displayName: 'Init Miner',
  postingKey: '5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n',
  activeKey: '5HqUkGuo62BfcJU5vNhTXKJRXuUi9QSE6jp8C3uBJ2BVHtB8WSd',
  memoKey: '5JfwFAMQPRx3sKdPLuJ4YWJPHV9UPR3XsPZunWNd5SvSU2xGsJd',
  description: 'Primary test account for general testing'
};

/**
 * Secondary test account for transfer targets
 * Use for: receiving transfers, multi-account scenarios
 */
export const secondaryTestAccount: TestAccount = {
  name: 'hiveio',
  displayName: 'Hive.io',
  description: 'Secondary account for receiving transfers'
};

/**
 * Third test account for complex scenarios
 * Use for: multi-sig, delegation, authority tests
 */
export const tertiaryTestAccount: TestAccount = {
  name: 'gtg',
  displayName: 'GTG',
  description: 'Third account for complex test scenarios'
};

/**
 * Account for error testing (non-existent)
 */
export const nonExistentAccount: TestAccount = {
  name: 'this-account-does-not-exist-12345',
  description: 'Non-existent account for error testing'
};

/**
 * Account with special characters (edge case testing)
 */
export const specialCharAccount: TestAccount = {
  name: 'test.user-123',
  description: 'Account with dots and dashes for edge case testing'
};

// ===========================================
// Google Test Users
// ===========================================

export interface GoogleTestUser {
  email: string;
  name: string;
  picture?: string;
}

export const googleTestUser: GoogleTestUser = {
  email: 'test.wallet.user@gmail.com',
  name: 'Test Wallet User',
  picture: 'https://lh3.googleusercontent.com/a/test-picture'
};

// ===========================================
// HTM/CTokens Test Users
// ===========================================

export interface HTMTestUser {
  account: string;
  password: string;
  operationalKey?: string;
}

export const htmTestUser: HTMTestUser = {
  account: 'testhtmuser',
  password: 'test-password-12345',
  operationalKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX'
};

// ===========================================
// Test Account Collections
// ===========================================

export const allTestAccounts = [
  primaryTestAccount,
  secondaryTestAccount,
  tertiaryTestAccount
];

export const accountsWithKeys = [
  primaryTestAccount
];

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get a test account by name
 */
export function getTestAccount (name: string): TestAccount | undefined {
  return allTestAccounts.find(a => a.name === name);
}

/**
 * Get accounts suitable for transfer testing
 */
export function getTransferTestAccounts (): { sender: TestAccount; receiver: TestAccount } {
  return {
    sender: primaryTestAccount,
    receiver: secondaryTestAccount
  };
}
