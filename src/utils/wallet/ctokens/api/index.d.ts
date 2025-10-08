type TEmptyReq = {}
export interface CtokensAppBalance {
  /** balance type (currency) */
  nai?: string;
  /** Balance value (amount of held tokens) */
  amount?: string;
  precision?: number;
  /** Key-value pairs with additional token metadata. */
  metadata?: object;
}

export type CtokensAppArrayOfBalances = CtokensAppBalance[];

export interface CtokensAppToken {
  /** Currency NAI */
  nai?: string;
  /** token owner */
  owner?: string;
  /** Number of decimal places */
  precision?: number;
  /** Total supply of the token */
  total_supply?: string;
  /** Maximum supply of the token. 0 means there is no max supply configured */
  max_supply?: string;
  /** True if coins can be regenerated to the pool. Their total number can not extend max_supply if set. */
  capped?: boolean;
  /** Determines if other users than token owner can stake given asset. */
  others_can_stake?: boolean;
  /** Determines if other users than token owner can unstake given asset. */
  others_can_unstake?: boolean;
  /** Marks given asset as a NFT. */
  is_nft?: boolean;
  /** Key-value pairs with additional token metadata. */
  metadata?: object;
}

export type CtokensAppArrayOfTokens = CtokensAppToken[];

export interface CtokensAppUser {
  management_key?: string;
  operational_key?: string;
  /** connected hive account */
  hive_account?: string | null;
  /** Key-value pairs with additional user metadata. */
  metadata?: object;
}

export type CtokensAppArrayOfUsers = CtokensAppUser[];

export interface CtokensAppTransactionStatusResponse {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

export interface CtokensAppTopHolder {
  /** Rank of the holder (1 = highest) */
  rank?: number;
  /** Operational key of the holder */
  user?: string;
  /** Amount of held tokens */
  amount?: string;
  /** Key-value pairs with additional user metadata. */
  metadata?: object;
}

export type CtokensAppArrayOfTopHolders = CtokensAppTopHolder[];

export interface CtokensAppBalanceHistory {
  /** Sequence number of the history entry */
  history_seq_no?: number;
  /** The closing balance */
  balance?: string;
  /** previous balance */
  prev_balance?: string;
  /** Diffrence between balance and prev_balance */
  balance_change?: string;
  /**
   * Creation date
   * @format date-time
   */
  timestamp?: string;
}

export type CtokensAppArrayOfBalanceHistory = CtokensAppBalanceHistory[];

export interface CtokensEndpointsGetTopHoldersParams {
  nai: string;
  precision: number;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
}

export interface CtokensEndpointsGetAccountBalancesParams {
  user: string;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
}

export interface CtokensEndpointsGetBalanceHistoryParams {
  user: string;
  nai: string;
  precision: number;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
}

export interface CtokensEndpointsGetRegisteredTokensParams {
  /** @default null */
  nai?: string;
  /** @default null */
  precision?: number;
}

export interface CtokensEndpointsGetRegisteredUsersParams {
  /** @default null */
  user?: string;
}

export interface CtokensEndpointsGetStatusParams {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  'ref-id': string;
}

type TWaxExtended = {
  ctokensApi: {
    version: {
      result: string,
      params: undefined
    },
    lastSyncedBlock: {
      result: number,
      params: undefined
    },
    topHolders: {
      result: CtokensAppArrayOfTopHolders,
      params: CtokensEndpointsGetTopHoldersParams & TEmptyReq & {
      }
    },
    balances: {
      result: CtokensAppArrayOfBalances,
      params: CtokensEndpointsGetAccountBalancesParams & TEmptyReq & {
      }
    },
    balanceHistory: {
      result: CtokensAppArrayOfBalanceHistory,
      params: CtokensEndpointsGetBalanceHistoryParams & TEmptyReq & {
      }
    },
    registeredTokens: {
      result: CtokensAppArrayOfTokens,
      params: CtokensEndpointsGetRegisteredTokensParams & TEmptyReq & {
      }
    },
    registeredUsers: {
      result: CtokensAppArrayOfUsers,
      params: CtokensEndpointsGetRegisteredUsersParams & TEmptyReq & {
      }
    },
    status: {
      result: CtokensAppTransactionStatusResponse,
      params: CtokensEndpointsGetStatusParams & TEmptyReq & {
      }
    }
  }
}
declare let WaxExtendedData: TWaxExtended;
export default WaxExtendedData;
