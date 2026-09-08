import { ADJECTIVES, NOUNS } from './account-name-words';

const NUMBER_SUFFIX_CHANCE = 0.5;

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/** Random name obeying the Hive rules: starts with a letter, ends with a letter or digit, hyphens only inside */
const generateAccountNameCandidate = (): string => {
  const suffix = Math.random() < NUMBER_SUFFIX_CHANCE ? `-${Math.floor(Math.random() * 90) + 10}` : '';

  return `${pick(ADJECTIVES)}-${pick(NOUNS)}${suffix}`;
};

/** Distinct random account name candidates - availability on the chain still has to be checked */
export const generateAccountNameCandidates = (count: number): string[] => {
  const names = new Set<string>();

  while (names.size < count)
    names.add(generateAccountNameCandidate());

  return [...names];
};
