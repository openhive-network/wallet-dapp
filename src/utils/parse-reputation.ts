export const parseReputation = (rawReputation: number): string => {
  if (rawReputation === 25)
    return 'No reputation';

  if (rawReputation > 75)
    return 'Legendary';
  if (rawReputation > 65)
    return 'Excellent';
  if (rawReputation > 55)
    return 'Great';
  if (rawReputation > 45)
    return 'Good';
  if (rawReputation > 35)
    return 'Acceptable';
  if (rawReputation > 25)
    return 'Average';
  if (rawReputation > 15)
    return 'Poor';
  if (rawReputation > 5)
    return 'Very poor';
  if (rawReputation >= 0)
    return 'Untrustworthy';

  return 'Very untrustworthy';
};
