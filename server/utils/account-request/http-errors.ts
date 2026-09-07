export const tokenClaimedError = () => createError({
  statusCode: 409,
  message: 'This account request token has already been used'
});

export const accountNameTakenError = (accountName: string) => createError({
  statusCode: 409,
  message: `Account @${accountName} has already been requested`
});

/** Unexpected failures are logged on the server - the client only learns that the request could not be processed */
export const accountRequestFailedError = () => createError({
  statusCode: 500,
  message: 'The account request could not be processed - please try again later'
});
