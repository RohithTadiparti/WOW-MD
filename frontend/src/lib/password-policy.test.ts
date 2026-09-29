import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PASSWORD_PATTERN, passwordError } from './password-policy';

describe('password policy', () => {
  it('matches the backend authentication policy', () => {
    const dto = readFileSync(new URL('../../../backend/src/modules/auth/dto/auth.dto.ts', import.meta.url), 'utf8');
    expect(dto).toContain(`export const PASSWORD_PATTERN = ${PASSWORD_PATTERN};`);
  });
  it.each(['', 'short1A', 'lowercase1', 'UPPERCASE1', 'NoDigitsHere', 'Password1' + 'a'.repeat(128)])('rejects invalid passwords', value => {
    expect(passwordError(value)).not.toBe('');
  });
  it('accepts the established policy', () => expect(passwordError('ValidPassword1')).toBe(''));
});
