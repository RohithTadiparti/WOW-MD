import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './auth.dto';

describe('ChangePasswordDto', () => {
  const valid = {
    currentPassword: 'OldPassword1',
    newPassword: 'NewPassword2',
    confirmNewPassword: 'NewPassword2',
  };
  const check = (body: object) =>
    validate(plainToInstance(ChangePasswordDto, body, { enableImplicitConversion: true }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  it('accepts valid credentials', async () => expect(await check(valid)).toEqual([]));
  it.each(['currentPassword', 'newPassword', 'confirmNewPassword'])(
    'requires a string for %s',
    async (field) => {
      for (const value of [undefined, null, '', 12345678, {}, []]) {
        expect((await check({ ...valid, [field]: value })).length).toBeGreaterThan(0);
      }
    },
  );
  it.each(['short1A', 'lowercase1', 'UPPERCASE1', 'NoDigitsHere', 'Password1' + 'a'.repeat(128)])(
    'rejects a password outside the existing policy',
    async (newPassword) => {
      expect((await check({ ...valid, newPassword })).length).toBeGreaterThan(0);
    },
  );
  it('rejects a client supplied user identity', async () => {
    expect((await check({ ...valid, userId: 'another-user' })).length).toBeGreaterThan(0);
  });
});
