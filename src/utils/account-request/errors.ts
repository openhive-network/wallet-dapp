interface FetchErrorLike {
  data?: { message?: string };
}

/** `$fetch` rejects with the bare HTTP failure - the message returned by the account request API is the one meant for the user */
export const toAccountRequestError = (error: unknown): Error =>
  new Error((error as FetchErrorLike | null | undefined)?.data?.message || 'Account request service is unreachable', { cause: error });
