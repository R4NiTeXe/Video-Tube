export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidMobile = (mobile) => {
  return /^\+?[1-9]\d{9,14}$/.test(mobile);
};

export const detectChannel = (identifier) => {
  if (/^\+?[1-9]\d{9,14}$/.test(identifier.trim())) return "whatsapp";
  return "email";
};

export const isValidUsername = (username) => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};