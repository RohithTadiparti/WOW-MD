import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/auth/entities/user.entity';
import { RefreshSession } from '../src/modules/auth/entities/refresh-session.entity';
import { UserRole } from '../src/common/enums';

describe('Change password API', () => {
  let app: INestApplication;
  let db: DataSource;
  let user: User;
  let other: User;
  let token: string;
  let oldHash: string;
  const currentPassword = 'OriginalPassword1';
  const newPassword = 'ReplacementPassword2';
  const route = '/auth/password/change';
  const valid = { currentPassword, newPassword, confirmNewPassword: newPassword };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    db = app.get(DataSource);
    oldHash = await bcrypt.hash(currentPassword, 4);
    const users = db.getRepository(User);
    user = await users.save(
      users.create({
        email: `password-${Date.now()}@gmail.com`,
        passwordHash: oldHash,
        role: UserRole.BRIDE,
        isActive: true,
        isVerified: true,
      }),
    );
    other = await users.save(
      users.create({
        email: `other-password-${Date.now()}@gmail.com`,
        passwordHash: oldHash,
        role: UserRole.GROOM,
        isActive: true,
        isVerified: true,
      }),
    );
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: currentPassword })
      .expect(200);
    token = login.body.accessToken;
  }, 90000);
  afterAll(async () => {
    if (db && user) {
      await db.getRepository(RefreshSession).delete({ userId: user.id });
      await db.getRepository(User).delete(user.id);
    }
    if (db && other) await db.getRepository(User).delete(other.id);
    await app?.close();
  });
  const change = (body: object) =>
    request(app.getHttpServer()).post(route).set('Authorization', `Bearer ${token}`).send(body);
  const hash = async (id: string) =>
    (await db.getRepository(User).findOneOrFail({ where: { id }, select: ['passwordHash'] }))
      .passwordHash;
  it('requires authentication', async () => {
    await request(app.getHttpServer()).post(route).send(valid).expect(401);
  });
  it.each([
    { ...valid, currentPassword: 'WrongPassword1' },
    { ...valid, currentPassword: '' },
    { ...valid, newPassword: 'weak', confirmNewPassword: 'weak' },
    { ...valid, confirmNewPassword: 'DifferentPassword3' },
    { currentPassword, newPassword },
    { ...valid, newPassword: null },
  ])('rejects invalid input without changing credentials or clearing cookies', async (body) => {
    const response = await change(body).expect(400);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(await hash(user.id)).toBe(oldHash);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  it('rejects a supplied user ID', async () => {
    await change({ ...valid, userId: other.id }).expect(400);
    expect(await hash(other.id)).toBe(oldHash);
  });
  it('persists a bcrypt hash, retires sessions and accepts only the new password', async () => {
    const response = await change(valid).expect(200);
    expect(response.body).toEqual({ success: true });
    expect(response.headers['set-cookie']).toBeDefined();
    const stored = await hash(user.id);
    expect(stored).not.toBe(newPassword);
    expect(await bcrypt.compare(newPassword, stored)).toBe(true);
    expect(await bcrypt.compare(currentPassword, stored)).toBe(false);
    expect(await hash(other.id)).toBe(oldHash);
    const sessions = await db.getRepository(RefreshSession).findBy({ userId: user.id });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: currentPassword })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: newPassword })
      .expect(200);
  });
});
