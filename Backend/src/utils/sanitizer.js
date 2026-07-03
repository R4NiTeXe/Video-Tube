// Escape special regex characters to prevent ReDoS / NoSQL injection
export const escapeRegex = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Sanitize string input — trim, limit length, strip null bytes
export const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== "string") return "";
  return str.replace(/\0/g, "").trim().slice(0, maxLength);
};

// Sanitize HTML entities for safe rendering (basic XSS prevention)
export const escapeHtml = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
