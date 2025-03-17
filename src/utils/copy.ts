/**
 * Copies given text into clipboard.
 *
 * This function supports 3 ways of copying and fallbacks if any of them fails:
 * 1. Using the modern Clipboard API (navigator.clipboard.writeText) - on most browsers works only in secure context (HTTPS) or localhost
 * 2. Using the deprecated document.execCommand("copy") - deprecated, but still supported by most browsers - with Firefox works only on "click" event triggered by the user
 * 3. Using the prompt function - the most universal way, but requires user interaction
 */
export const copyText = (text: string) => {
  try {
    if (navigator.clipboard) { // is secure context
      return navigator.clipboard.writeText(text).catch(() => {
        prompt("Copy to clipboard: Ctrl+C, Enter", text);
      });
    } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) { // check if we can use deprecated copy command
      const textarea = document.createElement("textarea");
      textarea.textContent = text;
      textarea.style.width = "0";
      textarea.style.height = "0";
      textarea.style.position = "fixed"; // Prevent scrolling to bottom of page in MS Edge.
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if(!document.execCommand("copy")) // Security exception may be thrown by some browsers.
          throw new Error("Copy command was unsuccessful");
      } finally {
        document.body.removeChild(textarea);
      }
    }
    throw new Error("No clipboard support");
  } catch {
    prompt("Copy to clipboard: Ctrl+C, Enter", text);
  }
}
