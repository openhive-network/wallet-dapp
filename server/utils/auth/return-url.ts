/**
 * Builds an absolute, same-origin redirect URL from a user supplied return path,
 * preserving its existing query string and appending the given parameters.
 */
export const buildReturnRedirectUrl = (appUrl: string, returnUrl: string, params: Record<string, string>): string => {
  const base = new URL(appUrl);
  let target: URL;

  try {
    target = new URL(returnUrl, base);
  } catch {
    target = new URL('/', base);
  }

  if (target.origin !== base.origin)
    target = new URL('/', base);

  for (const [key, value] of Object.entries(params))
    target.searchParams.set(key, value);

  return target.toString();
};
