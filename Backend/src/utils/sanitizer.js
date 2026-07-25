export const escapeRegex = (str) => {
  if (typeof str !== "string" || str.trim().length === 0) return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
