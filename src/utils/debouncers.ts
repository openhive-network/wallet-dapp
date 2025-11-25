/**
 * Universal debounce function to limit how often a function can be called.
 * Useful for optimizing performance of functions called frequently, such as search input handlers.
 *
 * @param fn - The function to debounce. Can be asynchronous.
 * @param delay - Delay in milliseconds to wait before invoking the function after the last call.
 * @returns A debounced version of the input function.
 *
 * @example
 * ```ts
 * const debouncedFunction = debounce(async (query: string) => {
 *   try {
 *     // Perform search operation
 *   } catch(error) {
 *     toastError(error);
 *   }
 * }, 500);
 *
 * // Usage
 * debouncedFunction("search term");
 * ```
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const debounce = (fn: (...args: any[]) => (Promise<void> | void), delayMs = 1000) => {
  let timeoutId: ReturnType<typeof setTimeout> | null;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (...args: any[]) => {
    if (timeoutId)
      clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
};
