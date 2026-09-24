import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { User } from '../src/modules/auth/entities/user.entity';
import { Profile } from '../src/modules/users/entities/profile.entity';
import { ProfileDetails } from '../src/modules/profile-details/entities/profile-details.entity';
import { UserRole } from '../src/common/enums';

describe('Other Income API', () => {
  let app: INestApplication;
  let db: DataSource;
  const actors: { user: User; profile: Profile; token: string }[] = [];
  const base = { highestQualification: 'Masters', course: 'Engineering', occupationStatus: 'employed', incomeVisible: false };
  const primary = { company: 'Acme', designation: 'Engineer', workLocation: 'Hyderabad', salary: '1200000' };
  const sources = ['rental', 'business', 'agricultural', 'investment', 'other'].map((source, index) => ({ source, amount: String(index * 100000) }));

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    db = app.get(DataSource);
    const jwt = new JwtService({ secret: app.get(AppConfigService).auth.jwtSecret });
    for (const role of [UserRole.BRIDE, UserRole.AGENT]) {
      const users = db.getRepository(User);
      const user = await users.save(users.create({ email: `other-income-${role}-${Date.now()}@gmail.com`, passwordHash: 'fixture', role, isActive: true, isVerified: true }));
      const profiles = db.getRepository(Profile);
      const profile = await profiles.save(profiles.create({ userId: role === UserRole.AGENT ? null : user.id, managedByUserId: role === UserRole.AGENT ? user.id : null, displayName: 'Income Test', gender: 'Female' }));
      actors.push({ user, profile, token: jwt.sign({ sub: user.id, tv: 0 }) });
    }
  }, 90000);

  afterAll(async () => {
    for (const actor of actors) {
      await db.getRepository(Profile).delete(actor.profile.id);
      await db.getRepository(User).delete(actor.user.id);
    }
    await app?.close();
  });

  it.each([{ index: 0, portal: 'Individual' }, { index: 1, portal: 'Agent' }])('$portal saves, reloads, edits, removes and preserves salary', async ({ index }) => {
    const actor = actors[index];
    const route = `/api/profiles/${actor.profile.id}`;
    const save = (employment: object, extra: object = {}) => request(app.getHttpServer()).put(`${route}/details/education`)
      .set('Authorization', `Bearer ${actor.token}`).send({ ...base, employment, ...extra });
    const read = () => request(app.getHttpServer()).get(`${route}/details`).set('Authorization', `Bearer ${actor.token}`);
    const view = () => request(app.getHttpServer()).get(`${route}/view`).set('Authorization', `Bearer ${actor.token}`);

    await db.getRepository(ProfileDetails).save({ profileId: actor.profile.id, employment: primary, religion: 'Hindu' });
    expect((await read().expect(200)).body.details.employment).toEqual(primary);
    expect((await save(primary).expect(200)).body.employment).toEqual(primary);
    const created = await save({ ...primary, otherIncome: sources }).expect(200);
    const entries = created.body.employment.otherIncome;
    expect(entries).toHaveLength(5);
    expect(new Set(entries.map((entry: { id: string }) => entry.id)).size).toBe(5);
    expect((await db.getRepository(ProfileDetails).findOneByOrFail({ profileId: actor.profile.id })).employment)
      .toEqual({ ...primary, otherIncome: entries });
    expect((await read().expect(200)).body.details).toMatchObject({ employment: { ...primary, otherIncome: entries }, religion: 'Hindu' });

    // The public/view API must remove additional income as well as salary.
    expect((await view().expect(200)).body.details.employment).not.toHaveProperty('otherIncome');
    expect((await view().expect(200)).body.details.employment).not.toHaveProperty('salary');
    await save({ ...primary, otherIncome: entries }, { incomeVisible: true }).expect(200);
    expect((await view().expect(200)).body.details.employment).toEqual({ ...primary, otherIncome: entries });

    const edited = entries.map((entry: object, i: number) => i === 1 ? { ...entry, amount: '765432' } : entry);
    await save({ ...primary, otherIncome: edited }).expect(200);
    expect((await read().expect(200)).body.details.employment.otherIncome).toEqual(edited);
    const kept = edited.filter((_entry: object, i: number) => i !== 2);
    await save({ ...primary, otherIncome: kept }).expect(200);
    expect((await read().expect(200)).body.details.employment).toEqual({ ...primary, otherIncome: kept });

    // An older client omitting the optional field cannot erase the new data.
    await save(primary).expect(200);
    expect((await read().expect(200)).body.details.employment.otherIncome).toEqual(kept);
    await request(app.getHttpServer()).put(`${route}/details/education`).set('Authorization', `Bearer ${actor.token}`)
      .send({ ...base, occupationStatus: 'student' }).expect(200);
    expect((await read().expect(200)).body.details.employment).toEqual({ ...primary, otherIncome: kept });

    for (const otherIncome of [null, [[]], [{ source: 'unknown', amount: '1' }], [{ source: 'rental', amount: '-1' }], [kept[0], kept[0]]]) {
      await save({ ...primary, otherIncome }).expect(400);
    }
    expect((await read().expect(200)).body.details.employment).toEqual({ ...primary, otherIncome: kept });
    await save({ otherIncome: [] }).expect(200);
    expect((await read().expect(200)).body.details.employment).toEqual({ ...primary, otherIncome: [] });
    expect((await db.getRepository(ProfileDetails).findOneByOrFail({ profileId: actor.profile.id })).employment)
      .toEqual({ ...primary, otherIncome: [] });
    await save({ ...primary, salary: null }).expect(200);
    expect((await read().expect(200)).body.details.employment).toEqual({ ...primary, salary: null, otherIncome: [] });
  });

  it('enforces authentication, ownership and claimed-client restrictions', async () => {
    const put = (index: number, token?: string) => {
      const req = request(app.getHttpServer()).put(`/api/profiles/${actors[index].profile.id}/details/education`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req.send({ ...base, employment: { ...primary, otherIncome: sources } });
    };
    await put(0).expect(401);
    await put(0, actors[1].token).expect(403);
    await put(1, actors[0].token).expect(403);
    await request(app.getHttpServer()).get(`/api/profiles/${actors[1].profile.id}/details`)
      .set('Authorization', `Bearer ${actors[0].token}`).expect(403);
    await db.getRepository(Profile).update(actors[0].profile.id, { userId: null });
    await db.getRepository(Profile).update(actors[1].profile.id, { userId: actors[0].user.id });
    await put(1, actors[1].token).expect(403);
    await put(1, actors[0].token).expect(200);
  });

  it('uses the existing migrated employment JSONB column', async () => {
    const runner = db.createQueryRunner();
    try {
      const table = await runner.getTable('profile_details');
      expect(table?.findColumnByName('employment')?.type).toBe('jsonb');
      expect(table?.findColumnByName('otherIncome')).toBeUndefined();
    } finally {
      await runner.release();
    }
  });
});
