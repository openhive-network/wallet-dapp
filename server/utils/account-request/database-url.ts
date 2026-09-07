import { isAbsolute, resolve } from 'node:path';

export const DEFAULT_ACCOUNT_REQUEST_DATABASE_URL = 'file:./.data/account-requests.sqlite';

const FILE_URL_PREFIX = 'file:';

/**
 * Resolves a relative SQLite `file:` URL against the project root,
 * so the Prisma CLI (migrations) and the running server open the same database file.
 */
export const resolveAccountRequestDatabaseUrl = (url: string | undefined, rootDir: string = process.cwd()): string => {
  const value = url?.trim() || DEFAULT_ACCOUNT_REQUEST_DATABASE_URL;

  if (!value.startsWith(FILE_URL_PREFIX))
    return value;

  const filePath = value.slice(FILE_URL_PREFIX.length);

  if (!filePath || filePath === ':memory:' || isAbsolute(filePath))
    return value;

  return `${FILE_URL_PREFIX}${resolve(rootDir, filePath)}`;
};
