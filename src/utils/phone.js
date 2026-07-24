// Shared phone input normalization. Moved verbatim out of pages/auth/Login.jsx
// so the portal login can reuse the exact same behaviour (locked +998 prefix,
// 9 digits max, prefix restored when the user tries to delete it).
export const PHONE_PREFIX = "+998";

export function normalizePhoneValue(value) {
  if (value.startsWith(PHONE_PREFIX)) {
    return value.slice(0, PHONE_PREFIX.length + 9);
  }
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) {
    return ("+" + digits).slice(0, PHONE_PREFIX.length + 9);
  }
  // Prefiks o'chirilgan/o'zgartirilgan urinish — qayta tiklaymiz
  return PHONE_PREFIX;
}
