import { isPublicKey } from '@hiveio/wax';

import {
  ACCOUNT_REGISTRATION_METHODS,
  ACCOUNT_ROLES,
  type AccountPublicKeys,
  type AccountRegistrationMethod,
  type AccountRequestClaimBody
} from '#shared/types/account-request';
import { normalizeAccountName } from '#shared/utils/account-name';

export type ClaimBodyParseResult =
  | { ok: true; value: AccountRequestClaimBody }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const parsePublicKeys = (value: unknown): AccountPublicKeys | string => {
  if (!isRecord(value))
    return 'publicKeys must be an object';

  const keys = {} as AccountPublicKeys;

  for (const role of ACCOUNT_ROLES) {
    const key = value[role];

    if (typeof key !== 'string' || !isPublicKey(key))
      return `publicKeys.${role} must be a valid Hive public key`;

    keys[role] = key;
  }

  return keys;
};

export const parseClaimBody = (body: unknown): ClaimBodyParseResult => {
  if (!isRecord(body))
    return { ok: false, error: 'Request body must be a JSON object' };

  const { token, accountName, method, publicKeys } = body;

  if (typeof token !== 'string' || !token)
    return { ok: false, error: 'token is required' };

  if (typeof accountName !== 'string' || !normalizeAccountName(accountName))
    return { ok: false, error: 'accountName is required' };

  if (!ACCOUNT_REGISTRATION_METHODS.includes(method as AccountRegistrationMethod))
    return { ok: false, error: `method must be one of: ${ACCOUNT_REGISTRATION_METHODS.join(', ')}` };

  const parsedKeys = parsePublicKeys(publicKeys);
  if (typeof parsedKeys === 'string')
    return { ok: false, error: parsedKeys };

  return {
    ok: true,
    value: {
      token,
      accountName: normalizeAccountName(accountName),
      method: method as AccountRegistrationMethod,
      publicKeys: parsedKeys
    }
  };
};
