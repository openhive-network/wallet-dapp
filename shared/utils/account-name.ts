/** Strips the optional `@` prefix and surrounding whitespace from a user supplied account name */
export const normalizeAccountName = (value: string): string => {
  const trimmed = value.trim();

  return trimmed[0] === '@' ? trimmed.slice(1) : trimmed;
};
