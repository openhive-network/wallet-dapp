/**
 * Test Fixtures - Mock Responses
 *
 * Contains mock API responses for:
 * - Hive blockchain API
 * - Google OAuth & Drive API
 * - HTM/CTokens API
 */

// ===========================================
// Hive Blockchain API Mock Responses
// ===========================================

export const mockHiveAccount = {
  id: 123456,
  name: 'testuser',
  owner: {
    weight_threshold: 1,
    account_auths: [],
    key_auths: [['STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX', 1]]
  },
  active: {
    weight_threshold: 1,
    account_auths: [],
    key_auths: [['STM7YktNxTVsXPGZSoqP8VpBnHbP9VNfGDhnKnPU3MUPQnw7WUULP', 1]]
  },
  posting: {
    weight_threshold: 1,
    account_auths: [],
    key_auths: [['STM5jZtLoV8YbxCxr4imnbWn61zMB24wwonpnVhfXRmv7j6fk3dTH', 1]]
  },
  memo_key: 'STM6FATcpWJfyxyuGWYzrYxRhCF6R11E6gKdNb89PaZ5mSbQm8fYq',
  json_metadata: JSON.stringify({
    profile: {
      name: 'Test User',
      about: 'A test account for E2E testing',
      profile_image: 'https://example.com/avatar.png',
      website: 'https://example.com'
    }
  }),
  posting_json_metadata: '',
  proxy: '',
  previous_owner_update: '1970-01-01T00:00:00',
  last_owner_update: '1970-01-01T00:00:00',
  last_account_update: '2024-01-01T00:00:00',
  created: '2020-01-01T00:00:00',
  mined: false,
  recovery_account: 'hive',
  last_account_recovery: '1970-01-01T00:00:00',
  reset_account: 'null',
  comment_count: 0,
  lifetime_vote_count: 0,
  post_count: 10,
  can_vote: true,
  voting_manabar: {
    current_mana: '1000000000000',
    last_update_time: 1700000000
  },
  downvote_manabar: {
    current_mana: '250000000000',
    last_update_time: 1700000000
  },
  voting_power: 10000,
  balance: { amount: '10000000', precision: 3, nai: '@@000000021' }, // 10000 HIVE
  savings_balance: { amount: '5000000', precision: 3, nai: '@@000000021' }, // 5000 HIVE
  hbd_balance: { amount: '1000000', precision: 3, nai: '@@000000013' }, // 1000 HBD
  hbd_savings_balance: { amount: '500000', precision: 3, nai: '@@000000013' }, // 500 HBD
  hbd_seconds: '0',
  hbd_seconds_last_update: '2024-01-01T00:00:00',
  hbd_last_interest_payment: '2024-01-01T00:00:00',
  savings_hbd_balance: { amount: '500000', precision: 3, nai: '@@000000013' },
  savings_hbd_seconds: '0',
  savings_hbd_seconds_last_update: '2024-01-01T00:00:00',
  savings_hbd_last_interest_payment: '2024-01-01T00:00:00',
  savings_withdraw_requests: 0,
  reward_hbd_balance: { amount: '100000', precision: 3, nai: '@@000000013' },
  reward_hive_balance: { amount: '100000', precision: 3, nai: '@@000000021' },
  reward_vesting_balance: { amount: '1000000000', precision: 6, nai: '@@000000037' },
  reward_vesting_hive: { amount: '500000', precision: 3, nai: '@@000000021' },
  vesting_shares: { amount: '50000000000000', precision: 6, nai: '@@000000037' }, // ~25000 HP
  delegated_vesting_shares: { amount: '1000000000000', precision: 6, nai: '@@000000037' },
  received_vesting_shares: { amount: '500000000000', precision: 6, nai: '@@000000037' },
  vesting_withdraw_rate: { amount: '0', precision: 6, nai: '@@000000037' },
  post_voting_power: { amount: '50000000000000', precision: 6, nai: '@@000000037' },
  next_vesting_withdrawal: '1969-12-31T23:59:59',
  withdrawn: 0,
  to_withdraw: 0,
  withdraw_routes: 0,
  pending_transfers: 0,
  curation_rewards: 100000,
  posting_rewards: 50000,
  proxied_vsf_votes: [0, 0, 0, 0],
  witnesses_voted_for: 0,
  last_post: '2024-06-01T00:00:00',
  last_root_post: '2024-06-01T00:00:00',
  last_vote_time: '2024-06-01T00:00:00',
  post_bandwidth: 0,
  pending_claimed_accounts: 0,
  governance_vote_expiration_ts: '2025-12-31T23:59:59'
};

export const mockHiveAccountExtended = {
  ...mockHiveAccount,
  reputation: 75000000000000
};

export const mockDynamicGlobalProperties = {
  head_block_number: 80000000,
  head_block_id: '04c4b40000000000000000000000000000000000',
  time: '2024-12-01T12:00:00',
  current_witness: 'witness1',
  total_pow: 514415,
  num_pow_witnesses: 172,
  virtual_supply: { amount: '500000000000', precision: 3, nai: '@@000000021' },
  current_supply: { amount: '450000000000', precision: 3, nai: '@@000000021' },
  init_hbd_supply: { amount: '0', precision: 3, nai: '@@000000013' },
  current_hbd_supply: { amount: '30000000000', precision: 3, nai: '@@000000013' },
  total_vesting_fund_hive: { amount: '200000000000', precision: 3, nai: '@@000000021' },
  total_vesting_shares: { amount: '400000000000000000', precision: 6, nai: '@@000000037' },
  total_reward_fund_hive: { amount: '0', precision: 3, nai: '@@000000021' },
  total_reward_shares2: '0',
  pending_rewarded_vesting_shares: { amount: '500000000000000', precision: 6, nai: '@@000000037' },
  pending_rewarded_vesting_hive: { amount: '250000000', precision: 3, nai: '@@000000021' },
  hbd_interest_rate: 2000,
  hbd_print_rate: 10000,
  maximum_block_size: 65536,
  required_actions_partition_percent: 0,
  current_aslot: 80500000,
  recent_slots_filled: '340282366920938463463374607431768211455',
  participation_count: 128,
  last_irreversible_block_num: 79999980,
  vote_power_reserve_rate: 10,
  delegation_return_period: 432000,
  reverse_auction_seconds: 0,
  available_account_subsidies: 24979942,
  hbd_stop_percent: 2000,
  hbd_start_percent: 1000,
  next_maintenance_time: '2024-12-02T00:00:00',
  last_budget_time: '2024-12-01T00:00:00',
  next_daily_maintenance_time: '2024-12-02T00:00:00',
  content_reward_percent: 6500,
  vesting_reward_percent: 1500,
  proposal_fund_percent: 1000,
  dhf_interval_ledger: { amount: '50000000', precision: 3, nai: '@@000000013' },
  downvote_pool_percent: 2500,
  current_remove_threshold: 200,
  early_voting_seconds: 86400,
  mid_voting_seconds: 172800,
  max_consecutive_recurrent_transfer_failures: 10,
  max_recurrent_transfer_end_date: 730,
  min_recurrent_transfers_recurrence: 24,
  max_open_recurrent_transfers: 255
};

// ===========================================
// Google OAuth Mock Responses
// ===========================================

export const mockGoogleUser = {
  name: 'Test Google User',
  email: 'testuser@gmail.com',
  picture: 'https://lh3.googleusercontent.com/a/test-picture'
};

export const mockGoogleAuthStatus = {
  authenticated: true,
  user: mockGoogleUser
};

export const mockGoogleAuthStatusUnauthenticated = {
  authenticated: false,
  user: null
};

export const mockGoogleDriveToken = {
  token: 'mock-google-drive-access-token-12345'
};

export const mockGoogleDriveWalletFile = {
  exists: true,
  fileId: 'mock-file-id-12345'
};

export const mockGoogleDriveWalletFileNotExists = {
  exists: false,
  fileId: null
};

// ===========================================
// HTM/CTokens API Mock Responses
// ===========================================

export const mockCTokensToken = {
  nai: '@@100000001',
  assetNum: 100000001,
  precision: 8,
  ownerPublicKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX',
  totalSupply: '100000000000000',
  maxSupply: '1000000000000000',
  capped: true,
  othersCanStake: true,
  othersCanUnstake: true,
  metadata: JSON.stringify({
    name: 'Test Token',
    symbol: 'TEST',
    description: 'A test token for E2E testing',
    website: 'https://test-token.example.com',
    image: 'https://test-token.example.com/logo.png',
    type: 0 // Fungible
  })
};

export const mockCTokensVestingToken = {
  ...mockCTokensToken,
  nai: '@@100000002',
  assetNum: 100000002,
  metadata: JSON.stringify({
    name: 'Test Token (Staked)',
    symbol: 'TEST.STAKED',
    description: 'Staked version of Test Token',
    type: 0
  })
};

export const mockCTokensBalance = {
  account: 'testuser',
  nai: '@@100000001',
  balance: '1000000000000' // 10000.00000000 TEST
};

export const mockCTokensUser = {
  account: 'testuser',
  operationalKey: 'STM8GC13uCZbP44HzMLV6zPZGwVQ8Nt4Kji8PapsPiNq1BK153XTX',
  metadata: JSON.stringify({
    name: 'Test User',
    about: 'A test HTM user',
    profileImage: 'https://example.com/avatar.png',
    website: 'https://example.com'
  })
};

export const mockCTokensTokenList = {
  items: [mockCTokensToken, mockCTokensVestingToken],
  total: 2,
  page: 1,
  pages: 1,
  hasMore: false
};

export const mockCTokensBalanceList = {
  items: [mockCTokensBalance],
  total: 1,
  page: 1,
  pages: 1,
  hasMore: false
};

// ===========================================
// Transaction Mock Responses
// ===========================================

export const mockTransactionResponse = {
  id: 'mock-transaction-id-12345',
  block_num: 80000001,
  trx_num: 0,
  expired: false
};

export const mockBroadcastSuccess = {
  success: true,
  transaction_id: 'mock-tx-id-12345',
  block_num: 80000001
};

// ===========================================
// Error Responses
// ===========================================

export const mockErrorResponse = {
  error: {
    code: -32000,
    message: 'Assert Exception',
    data: {
      code: 10,
      name: 'assert_exception',
      message: 'Account does not exist'
    }
  }
};

export const mockNetworkError = {
  error: {
    code: -1,
    message: 'Network error',
    data: null
  }
};
