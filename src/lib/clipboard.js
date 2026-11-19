/**
 * Clipboard utility — wraps the Clipboard API with graceful fallback.
 * @module lib/clipboard
 */

/**
 * Copy text to the clipboard.
 * Falls back to a hidden textarea + execCommand when the async
 * Clipboard API is unavailable (e.g. non-secure contexts).
 *
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} true on success
 */
export async function copyToClipboard(text) {
  // Prefer the modern async API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy fallback
    }
  }

  // Legacy fallback for older browsers / non-secure contexts
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly");
    textarea.style.position = "fixed";
    textarea.style.inset = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
