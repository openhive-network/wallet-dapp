/**
 * Integration Tests: Account name suggestions
 *
 * The generator runs without the chain, so its output is checked here against the Hive account name rules:
 * 3 to 16 characters, dot separated segments of at least 3 characters, each starting with a letter,
 * ending with a letter or digit and using only lowercase letters, digits and hyphens in between.
 */

import { test, expect } from '@playwright/test';

import { generateAccountNameCandidates } from '../../../src/utils/account-name-suggestions';
import { ADJECTIVES, NOUNS } from '../../../src/utils/account-name-words';

const SEGMENT_PATTERN = /^[a-z][a-z0-9-]+[a-z0-9]$/;
/** Two words of this shape joined by a hyphen leave room for the optional two digit suffix within 16 characters */
const WORD_PATTERN = /^[a-z]{3,6}$/;

const isValidHiveAccountName = (name: string) =>
  name.length >= 3 && name.length <= 16 && name.split('.').every(segment => SEGMENT_PATTERN.test(segment));

test.describe('Account name suggestions', () => {
  test('should build on distinct lowercase words of 3 to 6 letters', () => {
    for (const word of [...ADJECTIVES, ...NOUNS])
      expect(word, `"${word}" is not a 3 to 6 letter lowercase word`).toMatch(WORD_PATTERN);

    expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
    expect(new Set(NOUNS).size).toBe(NOUNS.length);
    expect(ADJECTIVES.filter(word => (NOUNS as readonly string[]).includes(word))).toEqual([]);
  });

  test('should generate names obeying the Hive account name rules', () => {
    for (const name of generateAccountNameCandidates(500))
      expect(isValidHiveAccountName(name), `"${name}" breaks the account name rules`).toBe(true);
  });

  test('should generate distinct names within a batch', () => {
    const names = generateAccountNameCandidates(25);

    expect(new Set(names).size).toBe(names.length);
  });
});
