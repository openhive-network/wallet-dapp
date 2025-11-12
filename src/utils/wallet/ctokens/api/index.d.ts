type TEmptyReq = {}
export interface CtokensAppBalance {
  /** unique identifier for the token */
  asset_num?: number;
  /** balance type (currency) */
  nai?: string;
  /** Balance value (amount of held tokens) */
  amount?: string;
  precision?: number;
  /** Key-value pairs with additional token metadata. */
  metadata?: Record<string, any>;
}

export interface CtokensAppLiquidAndVestingBalance {
  /** Indicates if the balance is for an NFT */
  is_nft?: boolean;
  liquid?: CtokensAppBalance;
  vesting?: CtokensAppBalance;
}

export interface CtokensAppAccountBalancesResponse {
  /** Total number of items */
  total_items?: number;
  /** Total number of pages */
  total_pages?: number;
  /** List of balance */
  items?: CtokensAppLiquidAndVestingBalance[];
}

export enum CtokensAppSortDirection {
  Asc = "asc",
  Desc = "desc",
}

export enum CtokensAppAssetType {
  All = "all",
  Token = "token",
  Nft = "nft",
}

export interface CtokensAppToken {
  /** Asset symbol, unique identifier for the token */
  asset_num?: number;
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
  metadata?: Record<string, any>;
}

export interface CtokensAppLiquidAndVestingToken {
  liquid?: CtokensAppToken;
  vesting?: CtokensAppToken;
}

export interface CtokensAppRegisteredTokensResponse {
  /** Total number of items */
  total_items?: number;
  /** Total number of pages */
  total_pages?: number;
  /** List of registered tokens */
  items?: CtokensAppLiquidAndVestingToken[];
}

export interface CtokensAppUser {
  management_key?: string;
  operational_key?: string;
  /** connected hive account */
  hive_account?: string | null;
  /** Key-value pairs with additional user metadata. */
  metadata?: Record<string, any>;
}

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
  metadata?: Record<string, any>;
}

export interface CtokensAppTopHolderResponse {
  /** Total number of items */
  total_items?: number;
  /** Total number of pages */
  total_pages?: number;
  /** List of top holders */
  items?: CtokensAppTopHolder[];
}

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

export interface CtokensAppBalanceHistoryResponse {
  /** Total number of items */
  total_items?: number;
  /** Total number of pages */
  total_pages?: number;
  /** List of balance history items */
  items?: CtokensAppBalanceHistory[];
}

export interface CtokensAppNft {
  /** Unique identifier for the NFT */
  unique_id?: string;
  /** Operational key of the NFT owner */
  owner?: string;
  /** Key-value pairs with additional token metadata. */
  metadata?: Record<string, any>;
}

export interface CtokensAppNftsResponse {
  /** Total number of items */
  total_items?: number;
  /** Total number of pages */
  total_pages?: number;
  /** List of NFTs */
  items?: CtokensAppNft[];
}

export interface CtokensAppNftHistory {
  /** Sequence number of the history entry */
  history_seq_no?: number;
  /** Type of operation (e.g., create, transfer, stake, unstake) */
  event_type?: string;
  /** Whether the balance is liquid or vesting */
  is_liquid?: boolean;
  /** unique identifier of the asset (liquid or vesting) */
  asset_num?: number;
  /** operational key of the new NFT owner */
  owner?: string;
  /**
   * Creation date
   * @format date-time
   */
  timestamp?: string;
}

export interface CtokensAppNftHistoryResponse {
  /** Total number of items */
  total_items?: number;
  /** Total number of pages */
  total_pages?: number;
  /** List of balance history items */
  items?: CtokensAppNftHistory[];
}

export interface BroadcastProxyErrorResponse {
  /** Indicates if the trasaction was an error */
  success?: boolean;
  /** Error message if the trasaction failed */
  error?: string;
}

export interface BroadcastProxyResponse {
  /** Indicates if the trasaction was successful */
  success?: boolean;
  /** Reference ID of the broadcasted transaction */
  "ref-id"?: string;
}

export interface ProxyTransaction {
  /**
   * Protocol version of the transaction
   * @example "1"
   */
  protocol_version?: string;
  /**
   * Reference block prefix
   * @example "2220321480"
   */
  ref_block_prefix?: string;
  /**
   * List of operations included in the transaction
   * @example []
   */
  operations?: Record<string, any>[];
  /**
   * List of signatures for the transaction
   * @example []
   */
  signatures?: string[];
}

export interface BroadcastProxyInput {
  /** The transaction object to be broadcasted */
  trx?: ProxyTransaction;
}

export interface CtokensEndpointsGetTopHoldersParams {
  "asset-num": number;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Return max `page-size` operations per page, defaults to `100`
   * @default 100
   */
  "page-size"?: number;
  /**
   * Sort order:
   *
   *  * `asc` - Ascending, from A to Z or smallest to largest
   *
   *  * `desc` - Descending, from Z to A or largest to smallest
   * @default "desc"
   */
  direction?: CtokensAppSortDirection;
}

export interface CtokensEndpointsGetAccountBalancesParams {
  user: string;
  /** @default null */
  "asset-num"?: number;
  /**
   * Filter by asset type:
   *
   *  * `all` - both tokens and NFTs
   *
   *  * `token` - only tokens
   *
   *  * `nft` - only NFTs
   * @default "all"
   */
  "asset-type"?: CtokensAppAssetType;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Return max `page-size` operations per page, defaults to `100`
   * @default 100
   */
  "page-size"?: number;
  /**
   * Sort order:
   *
   *  * `asc` - Ascending, from A to Z or smallest to largest
   *
   *  * `desc` - Descending, from Z to A or largest to smallest
   * @default "desc"
   */
  direction?: CtokensAppSortDirection;
}

export interface CtokensEndpointsGetNftParams {
  /** @default null */
  "unique-id": string;
}

export interface CtokensEndpointsGetNftsParams {
  "asset-num": number;
  /** @default null */
  owner?: string;
  /** @default null */
  "unique-id"?: string;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Return max `page-size` operations per page, defaults to `100`
   * @default 100
   */
  "page-size"?: number;
  /**
   * Sort order:
   *
   *  * `asc` - Ascending, from A to Z or smallest to largest
   *
   *  * `desc` - Descending, from Z to A or largest to smallest
   * @default "desc"
   */
  direction?: CtokensAppSortDirection;
}

export interface CtokensEndpointsGetBalanceHistoryParams {
  user: string;
  "asset-num": number;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Return max `page-size` operations per page, defaults to `100`
   * @default 100
   */
  "page-size"?: number;
  /**
   * Sort order:
   *
   *  * `asc` - Ascending, from A to Z or smallest to largest
   *
   *  * `desc` - Descending, from Z to A or largest to smallest
   * @default "desc"
   */
  direction?: CtokensAppSortDirection;
}

export interface CtokensEndpointsGetNftHistoryParams {
  "unique-id": string;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Return max `page-size` operations per page, defaults to `100`
   * @default 100
   */
  "page-size"?: number;
  /**
   * Sort order:
   *
   *  * `asc` - Ascending, from A to Z or smallest to largest
   *
   *  * `desc` - Descending, from Z to A or largest to smallest
   * @default "desc"
   */
  direction?: CtokensAppSortDirection;
}

export interface CtokensEndpointsGetRegisteredTokensParams {
  /**
   * Filter by owner (accepts both operational and management keys).
   * @default null
   */
  owner?: string;
  /** @default null */
  "asset-num"?: number;
  /**
   * Filter by asset type:
   *
   *  * `all` - both tokens and NFTs
   *
   *  * `token` - only tokens
   *
   *  * `nft` - only NFTs
   * @default "all"
   */
  "asset-type"?: CtokensAppAssetType;
  /**
   * 100 results per page (default `1`).
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Return max `page-size` operations per page, defaults to `100`
   * @default 100
   */
  "page-size"?: number;
  /**
   * Sort order:
   *
   *  * `asc` - Ascending, from A to Z or smallest to largest
   *
   *  * `desc` - Descending, from Z to A or largest to smallest
   * @default "desc"
   */
  direction?: CtokensAppSortDirection;
}

export interface CtokensEndpointsGetRegisteredUsersParams {
  /** @default null */
  user: string;
}

export interface CtokensEndpointsGetStatusParams {
  "ref-id": string;
}

type TWaxExtended = {
  ctokensApi: {
    broadcastProxy: {
      result: BroadcastProxyResponse,
      params: TEmptyReq & BroadcastProxyInput & {
      }
    },
    version: {
      result: string,
      params: undefined
    },
    lastSyncedBlock: {
      result: number,
      params: undefined
    },
    topHolders: {
      result: CtokensAppTopHolderResponse,
      params: CtokensEndpointsGetTopHoldersParams & TEmptyReq & {
      }
    },
    balances: {
      result: CtokensAppAccountBalancesResponse,
      params: CtokensEndpointsGetAccountBalancesParams & TEmptyReq & {
      }
    },
    nft: {
      result: CtokensAppNft,
      params: CtokensEndpointsGetNftParams & TEmptyReq & {
      }
    },
    nfts: {
      result: CtokensAppNftsResponse,
      params: CtokensEndpointsGetNftsParams & TEmptyReq & {
      }
    },
    balanceHistory: {
      result: CtokensAppBalanceHistoryResponse,
      params: CtokensEndpointsGetBalanceHistoryParams & TEmptyReq & {
      }
    },
    nftHistory: {
      result: CtokensAppNftHistoryResponse,
      params: CtokensEndpointsGetNftHistoryParams & TEmptyReq & {
      }
    },
    tokens: {
      result: CtokensAppRegisteredTokensResponse,
      params: CtokensEndpointsGetRegisteredTokensParams & TEmptyReq & {
      }
    },
    users: {
      result: CtokensAppUser,
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
declare var WaxExtendedData: TWaxExtended
export default WaxExtendedData
