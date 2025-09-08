const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = DAY_MS * 7;
const MONTH_MS = DAY_MS * 30;
const YEAR_MS = DAY_MS * 365;

export const lessThanDate = (otherDate: Date) => {
  const diff = (Date.now() - otherDate.getTime());

  if (diff < DAY_MS)
    return 'less than a day ago';
  if (diff < WEEK_MS)
    return 'less than a week ago';
  if (diff < MONTH_MS)
    return 'less than a month ago';
  if (diff < YEAR_MS)
    return 'less than a year ago';

  return 'more than a year ago';
};
