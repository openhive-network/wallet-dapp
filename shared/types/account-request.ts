export const ACCOUNT_ROLES = ['owner', 'active', 'posting', 'memo'] as const;
export type AccountRole = typeof ACCOUNT_ROLES[number];
export type AccountPublicKeys = Record<AccountRole, string>;

export const ACCOUNT_REGISTRATION_METHODS = ['google', 'metamask', 'password'] as const;
export type AccountRegistrationMethod = typeof ACCOUNT_REGISTRATION_METHODS[number];

export const ACCOUNT_REQUEST_TOKEN_QUERY_PARAM = 'token';
export const ACCOUNT_REQUEST_CREATE_PATH = '/features/create-account';

export interface AccountRequestStatusResponse {
  /** Whether the QR onboarding module is fully configured on this server */
  enabled: boolean;
}

export interface AccountRequestTokenResponse {
  token: string;
  /** Token rotation interval in seconds */
  interval: number;
  /** Milliseconds until the current token rotates */
  ttlMs: number;
}

export type AccountRequestTokenRejection = 'invalid' | 'claimed';

export interface AccountRequestVerifyResponse {
  valid: boolean;
  reason?: AccountRequestTokenRejection;
}

export interface AccountRequestClaimBody {
  token: string;
  accountName: string;
  method: AccountRegistrationMethod;
  publicKeys: AccountPublicKeys;
}

export interface AccountRequestClaimResponse {
  success: true;
  accountName: string;
  transactionId: string;
}
