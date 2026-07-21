export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 16;

export const validatePasswordStrength = (password) => {
  const errors = [];
  if (!password || typeof password !== "string") {
    errors.push("at least 8 characters");
    return errors;
  }
  if (password.length < MIN_PASSWORD_LENGTH) errors.push("at least 8 characters");
  if (password.length > MAX_PASSWORD_LENGTH) errors.push("no more than 16 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("one special character");
  return errors;
};

export const assertPasswordStrength = (password) => {
  const errors = validatePasswordStrength(password);
  if (errors.length > 0) {
    throw new Error(`Password must contain ${errors.join(", ")}`);
  }
};