/** Mirrors the authentication DTO policy; parity is checked in tests. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export function passwordError(value: string): string {
  if (!value) return 'New password is required.';
  const length = Array.from(value).length;
  if (length > 128) return 'Password must be at most 128 characters.';
  return length >= 8 && PASSWORD_PATTERN.test(value) ? '' : 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit';
}
