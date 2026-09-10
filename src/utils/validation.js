const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export function getPasswordErrors(value) {
  const password = String(value || "");
  const errors = [];
  if (password.length < 8) errors.push("Password must contain at least 8 characters.");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) errors.push("Password must contain uppercase and lowercase letters.");
  if (!/\d/.test(password)) errors.push("Password must contain at least one number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Password must contain at least one symbol.");
  return errors;
}

export function publicAdmin(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    phone: user.phone,
    gender: user.gender,
    avatarUrl: user.avatarUrl,
    verified: user.verified,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}
