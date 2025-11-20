/**
 * Validation utilities for various input types
 */

/**
 * Validates amount precision for token amounts
 * @param amount - The amount string to validate
 * @param precision - Maximum number of decimal places allowed
 * @returns Validation result with error message and parsed amount if valid
 */
export const validateAmountPrecision = (
  amount: string,
  precision: number
): { isValid: boolean; error?: string; } => {
  try {
    if (amount === '')
      return { isValid: true };


    const cleanAmount = amount.replace(/[,\s]/g, '');
    const [integerPart, decimalPart, anyMore] = cleanAmount.split('.');
    if (anyMore !== undefined)
      return { isValid: false, error: 'Invalid amount format' };


    const decimal = BigInt(decimalPart || 0);
    const integer = BigInt(integerPart || 0);

    if (integer < 0n || (integer === 0n && decimal <= 0n))
      return { isValid: false, error: 'Amount must be a positive number' };


    if (decimal !== 0n && (decimalPart?.length || 0) > precision)
      return { isValid: false, error: `Amount has too many decimal places. Maximum ${precision} decimal places allowed for this token.` };


    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid amount format' };
  }
};

/**
 * Validates Hive public key format
 * @param key - The public key to validate
 * @returns True if the key is valid
 */
export function isValidPublicKey (key: string): boolean {
  // Simple validation for Hive public key (starts with STM and has correct length)
  const hivePublicKeyRegex = /^STM[0-9A-Za-z]{50}$/;
  return hivePublicKeyRegex.test(key);
}

/**
 * Validates URL format
 * @param url - The URL to validate
 * @returns True if the URL is valid or empty
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty URL is valid (optional field)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates token symbol format
 * @param symbol - The token symbol to validate
 * @returns Validation result with error message
 */
export const validateTokenSymbol = (symbol: string): { isValid: boolean; message: string } => {
  const trimmed = symbol.trim();
  if (trimmed.length === 0)
    return { isValid: false, message: '' };
  if (trimmed.length < 3)
    return { isValid: false, message: 'Symbol must be at least 3 characters' };
  if (trimmed.length > 10)
    return { isValid: false, message: 'Symbol must be 10 characters or less' };
  if (!/^[A-Z]+$/i.test(trimmed))
    return { isValid: false, message: 'Symbol must contain only letters' };
  return { isValid: true, message: 'Valid symbol' };
};

/**
 * Validates token precision (number of decimal places)
 * @param precision - The precision value to validate
 * @returns True if precision is valid (0-12)
 */
export const isValidTokenPrecision = (precision: number | string): boolean => {
  const prec = typeof precision === 'string' ? parseInt(precision) : precision;
  return !isNaN(prec) && prec >= 0 && prec <= 12;
};

/**
 * Validates token supply amount
 * @param supply - The supply value to validate
 * @returns True if supply is valid (positive and within safe range)
 */
export const isValidTokenSupply = (supply: string): boolean => {
  if (!supply || supply.trim() === '') return false;
  try {
    const parsed = BigInt(supply);
    if (parsed <= 0n) return false;
    // Maximum safe value for (signed) int64
    return parsed <= BigInt('9223372036854775807');
  } catch {
    return false;
  }
};
