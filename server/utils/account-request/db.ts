import { PrismaLibSql } from '@prisma/adapter-libsql';

import type { AccountRegistrationMethod } from '#shared/types/account-request';

import { requireAccountRequestConfig } from './config';

import { PrismaClient } from '~~/prisma/generated/client/client';

export interface ClaimedTokenInput {
  token: string;
  accountName: string;
  method: AccountRegistrationMethod;
}

/**
 * Registry of tokens used to request an account. A row is inserted when the request is accepted and never removed,
 * so the unique token and account name columns are the only lock needed against repeated or concurrent requests.
 * `completedAt` marks a created account; a failed creation keeps the row with the failure in `error`.
 */
export class ClaimedTokensRepository {
  readonly #prisma: PrismaClient;

  public constructor (prisma: PrismaClient) {
    this.#prisma = prisma;
  }

  public async isClaimed (token: string): Promise<boolean> {
    return !!await this.#prisma.claimedToken.findUnique({ where: { token }, select: { token: true } });
  }

  /** Reserves the token and the account name for one creation request - `false` when either of them is already taken */
  public async claim ({ token, accountName, method }: ClaimedTokenInput): Promise<boolean> {
    try {
      await this.#prisma.claimedToken.create({ data: { token, accountName, method, claimedAt: new Date() } });

      return true;
    } catch (error) {
      // Rows are never removed, so a rejected insert is a clash exactly when one of the unique values is already stored
      if (await this.#isTaken(token, accountName))
        return false;

      throw error;
    }
  }

  async #isTaken (token: string, accountName: string): Promise<boolean> {
    return !!await this.#prisma.claimedToken.findFirst({ where: { OR: [{ token }, { accountName }] }, select: { token: true } });
  }

  public async complete (token: string, transactionId: string): Promise<void> {
    await this.#prisma.claimedToken.updateMany({ where: { token }, data: { transactionId, completedAt: new Date() } });
  }

  public async fail (token: string, error: string): Promise<void> {
    await this.#prisma.claimedToken.updateMany({ where: { token }, data: { error } });
  }
}

const repositories = new Map<string, ClaimedTokensRepository>();

/** Lazily creates the Prisma client for the configured datasource URL - nothing is opened until the module is used */
export const getClaimedTokensRepository = (): ClaimedTokensRepository => {
  const { databaseUrl } = requireAccountRequestConfig();
  let repository = repositories.get(databaseUrl);

  if (!repository) {
    repository = new ClaimedTokensRepository(new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) }));
    repositories.set(databaseUrl, repository);
  }

  return repository;
};
