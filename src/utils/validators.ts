/**
 * Validation utilities for various input types
 */

/**
 * Validates amount precision for token amounts
 * @param amount - The amount string to validate
 * @param precision - Maximum number of decimal places allowed
 * @returns Validation result with error message and parsed amount if valid
 */
export function validateAmountPrecision (
  amount: string,
  precision: number
): { isValid: boolean; error?: string; parsedAmount?: string } {
  try {
    // Remove thousand separators (commas, spaces) to get clean number
    const cleanAmount = amount.replace(/[,\s]/g, '');

    // Check if amount contains only valid characters (digits, decimal point)
    if (!/^\d*\.?\d*$/.test(cleanAmount))
      return { isValid: false, error: 'Amount must contain only digits and decimal point' };

    // Check if amount is a valid number
    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount) || numAmount <= 0)
      return { isValid: false, error: 'Amount must be a positive number' };

    // Check for infinity
    if (!isFinite(numAmount))
      return { isValid: false, error: 'Amount value is too large' };

    // Check decimal places - count actual decimal places in input
    const decimalIndex = cleanAmount.indexOf('.');
    if (decimalIndex !== -1) {
      const decimalPlaces = cleanAmount.length - decimalIndex - 1;
      if (decimalPlaces > precision) {
        return {
          isValid: false,
          error: `Amount has too many decimal places. Maximum ${precision} decimal places allowed for this token.`
        };
      }
    }

    // Convert to base units to check for overflow
    const multiplier = Math.pow(10, precision);
    const baseUnits = numAmount * multiplier;

    // Check for overflow - ensure it's within safe integer range
    const MAX_SAFE_BASE_UNITS = Number.MAX_SAFE_INTEGER;
    if (baseUnits > MAX_SAFE_BASE_UNITS)
      return { isValid: false, error: 'Amount is too large and would cause overflow' };

    // Ensure conversion to base units produces an integer (no precision loss)
    const roundedBaseUnits = Math.round(baseUnits);
    if (Math.abs(baseUnits - roundedBaseUnits) > 0.0001) {
      return {
        isValid: false,
        error: `Amount precision mismatch. Please use at most ${precision} decimal places.`
      };
    }

    return { isValid: true, parsedAmount: cleanAmount };
  } catch {
    return { isValid: false, error: 'Invalid amount format' };
  }
}

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
export function isValidUrl (url: string): boolean {
  if (!url) return true; // Empty URL is valid (optional field)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates token symbol format
 * @param symbol - The token symbol to validate
 * @returns Validation result with error message
 */
export function validateTokenSymbol (symbol: string): { isValid: boolean; message: string } {
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
}

/**
 * Validates token precision (number of decimal places)
 * @param precision - The precision value to validate
 * @returns True if precision is valid (0-12)
 */
export function isValidTokenPrecision (precision: number | string): boolean {
  const prec = typeof precision === 'string' ? parseInt(precision) : precision;
  return !isNaN(prec) && prec >= 0 && prec <= 12;
}

/**
 * Validates token supply amount
 * @param supply - The supply value to validate
 * @returns True if supply is valid (positive and within safe range)
 */
export function isValidTokenSupply (supply: string): boolean {
  if (!supply || supply.trim() === '') return false;
  const parsed = parseInt(supply);
  if (isNaN(parsed) || parsed <= 0) return false;
  // Maximum safe value for int64
  return BigInt(supply) <= BigInt('9223372036854775807');
}
