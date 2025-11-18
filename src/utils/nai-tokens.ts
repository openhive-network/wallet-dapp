// Helper functions for token transformation
// We should move these to wax to avoid duplication across projects

// Note: We are using BigInt to both: handle large numbers and avoid floating point precision issues during bitwise operations.
export const isVesting = (nai: string, precision: number): boolean =>
  (((BigInt(nai.slice(2, -1)) << 5n) | 0x10n | BigInt(precision)) & 0x20n) !== 0n;

const table = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0]
];

/**
 * Validate NAI format
 */
export const isValidNAI = (nai: string): boolean => /^@@\d{9}$/.test(nai);

const dammDigit = (str: string) => {
  let row = 0;

  for(let i = 0; i < str.length; i++) {
    const col = Number.parseInt(str.charAt(i), 10);

    if (Number.isNaN(col) || col < 0 || col > 9)
      throw new Error(`Invalid character '${str.charAt(i)}' in NAI string '${str}'`);

    row = table[row]![col]!;
  }

  return row.toString();
};

export const assetNumFromNAI = (nai: string, precision: number): bigint => {
  return (BigInt(Number.parseInt(nai.slice(2, -1))) << 5n) | 0x10n | BigInt(precision);
};

const generateRandomNAI = (symbol: string): string => {
  const timestamp = Date.now();
  const symbolUpper = symbol.trim().toUpperCase();

  // Create a hash-like value for uniqueness using a safer approach
  // Use modular arithmetic to prevent overflow
  const input = symbolUpper + timestamp;
  let hash = 0n;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    // Use bitwise operations and modular arithmetic to prevent overflow
    hash = ((hash << 5n) - hash + BigInt(char)) & 0x7fffffffn; // Keep within 31-bit positive range
  }

  // Ensure we have a positive number and convert to 8-digit string
  const naiNumber = Math.abs(Number(hash % 100000000n)).toString().padStart(8, '0');

  return `@@${naiNumber}${dammDigit(naiNumber)}`;
};

export const toVesting = (nai: string, precision: number): string => {
  const vestingNum = assetNumFromNAI(nai, precision) ^ 0x20n;

  const naiVesting = (vestingNum >> 5n).toString().padStart(8, '0');

  return `@@${naiVesting}${dammDigit(naiVesting)}`;
};

/// @alias toVesting - those two functions are identical as liquid/vesting is just a bit flag flip
export const toLiquid = (nai: string, precision: number): string => toVesting(nai, precision);

/**
 * Generate a unique NAI identifier for a token (liquid, not vesting)
 */
export const generateNAI = (symbol: string, precision: number): string => {
  let randomNAI: string;
  do
    randomNAI = generateRandomNAI(symbol);
  while (isVesting(randomNAI, precision)); // Keep generating until we get a liquid (non-vesting) NAI
  return randomNAI;
};
