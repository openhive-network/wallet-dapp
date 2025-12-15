/**
 * Test Fixtures - Test Tokens
 *
 * Pre-configured test tokens for HTM/CTokens E2E testing
 */

export interface TestToken {
  nai: string;
  symbol: string;
  name: string;
  precision: number;
  isNft: boolean;
  hasVesting: boolean;
  description?: string;
}

// ===========================================
// Fungible Tokens
// ===========================================

/**
 * Primary test token for transfer testing
 */
export const primaryTestToken: TestToken = {
  nai: '@@100000001',
  symbol: 'TEST',
  name: 'Test Token',
  precision: 8,
  isNft: false,
  hasVesting: true,
  description: 'Primary test token for general testing'
};

/**
 * Secondary token without vesting
 */
export const simpleTestToken: TestToken = {
  nai: '@@100000003',
  symbol: 'SIMPLE',
  name: 'Simple Token',
  precision: 3,
  isNft: false,
  hasVesting: false,
  description: 'Simple token without staking'
};

/**
 * Token with high precision
 */
export const highPrecisionToken: TestToken = {
  nai: '@@100000005',
  symbol: 'PRECISE',
  name: 'Precise Token',
  precision: 18,
  isNft: false,
  hasVesting: false,
  description: 'Token with high decimal precision'
};

// ===========================================
// NFT Tokens
// ===========================================

/**
 * Test NFT token
 */
export const testNftToken: TestToken = {
  nai: '@@200000001',
  symbol: 'TESTNFT',
  name: 'Test NFT',
  precision: 0,
  isNft: true,
  hasVesting: false,
  description: 'Test NFT token'
};

// ===========================================
// Token Collections
// ===========================================

export const allTestTokens = [
  primaryTestToken,
  simpleTestToken,
  highPrecisionToken,
  testNftToken
];

export const fungibleTokens = allTestTokens.filter(t => !t.isNft);
export const nftTokens = allTestTokens.filter(t => t.isNft);
export const stakableTokens = allTestTokens.filter(t => t.hasVesting);

// ===========================================
// Test Balances
// ===========================================

export interface TestTokenBalance {
  tokenNai: string;
  account: string;
  liquidBalance: string;
  stakedBalance: string;
}

export const testBalances: TestTokenBalance[] = [
  {
    tokenNai: primaryTestToken.nai,
    account: 'initminer',
    liquidBalance: '10000.00000000',
    stakedBalance: '5000.00000000'
  },
  {
    tokenNai: simpleTestToken.nai,
    account: 'initminer',
    liquidBalance: '1000.000',
    stakedBalance: '0.000'
  }
];

// ===========================================
// Token Creation Test Data
// ===========================================

export interface TokenCreationData {
  name: string;
  symbol: string;
  precision: number;
  maxSupply: string;
  initialSupply: string;
  description: string;
  website?: string;
  image?: string;
  allowStaking: boolean;
}

export const validTokenCreationData: TokenCreationData = {
  name: 'New Test Token',
  symbol: 'NEWTEST',
  precision: 8,
  maxSupply: '1000000000',
  initialSupply: '100000000',
  description: 'A brand new test token',
  website: 'https://newtest.example.com',
  image: 'https://newtest.example.com/logo.png',
  allowStaking: true
};

export const invalidTokenCreationData: TokenCreationData = {
  name: '', // Invalid: empty name
  symbol: 'TOOLONGSYMBOL123', // Invalid: too long
  precision: 25, // Invalid: too high
  maxSupply: '-1', // Invalid: negative
  initialSupply: '0',
  description: '',
  allowStaking: false
};

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get a test token by symbol
 */
export function getTestToken (symbol: string): TestToken | undefined {
  return allTestTokens.find(t => t.symbol === symbol);
}

/**
 * Get a test token by NAI
 */
export function getTestTokenByNai (nai: string): TestToken | undefined {
  return allTestTokens.find(t => t.nai === nai);
}

/**
 * Format amount with token precision
 */
export function formatTokenAmount (amount: number, token: TestToken): string {
  return amount.toFixed(token.precision);
}

/**
 * Parse token amount string to number
 */
export function parseTokenAmount (amountStr: string): number {
  return parseFloat(amountStr.replace(/,/g, ''));
}
