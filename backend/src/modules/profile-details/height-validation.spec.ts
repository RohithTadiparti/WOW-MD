import { ValidationPipe } from '@nestjs/common';
import { PersonalDetailsDto, PartnerPreferencesDto, ProfilePhotoDto } from './dto/profile-details.dto';
import { SuggestionsQueryDto } from '../matchmaking/dto/matchmaking.dto';
import { feetTransformer } from '../../common/util/height';

describe('Biodata height and photo API validation', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } });
  const personal = { firstName: 'Ada', lastName: 'Rao', complexion: 'wheatish', communicationAddress: 'Test address' };
  const preferences = { preferredAgeMin: 20, preferredAgeMax: 30, preferredHeightMinFeet: 3, preferredHeightMaxFeet: 8 };

  it.each([5.6, 5.7, 6.1, 3, 8])('accepts decimal feet %s across write and filter DTOs', async (heightFeet) => {
    await expect(pipe.transform({ ...personal, heightFeet }, { type: 'body', metatype: PersonalDetailsDto })).resolves.toMatchObject({ heightFeet });
    await expect(pipe.transform({ ...preferences, preferredHeightMinFeet: heightFeet }, { type: 'body', metatype: PartnerPreferencesDto })).resolves.toBeDefined();
    await expect(pipe.transform({ heightMinFeet: String(heightFeet) }, { type: 'query', metatype: SuggestionsQueryDto })).resolves.toMatchObject({ heightMinFeet: heightFeet });
  });

  it.each(['abc', -5.6, '', null, undefined, '5..6', '5.', 2.9, 8.1, 170, 5.65, NaN, Infinity])('rejects invalid required height %s', async (heightFeet) => {
    await expect(pipe.transform({ ...personal, heightFeet }, { type: 'body', metatype: PersonalDetailsDto })).rejects.toThrow();
    await expect(pipe.transform({ ...preferences, preferredHeightMinFeet: heightFeet }, { type: 'body', metatype: PartnerPreferencesDto })).rejects.toThrow();
  });

  it.each(['', 'abc', '-5.6', '5..6', '5.', '5e0', '0x5', ' 5.6 ', '8.1', '5.65'])('rejects malformed height filter %s', async (heightMinFeet) => {
    await expect(pipe.transform({ heightMinFeet }, { type: 'query', metatype: SuggestionsQueryDto })).rejects.toThrow();
  });

  it('allows an omitted optional filter and returns database numeric values as numbers', async () => {
    await expect(pipe.transform({}, { type: 'query', metatype: SuggestionsQueryDto })).resolves.toBeDefined();
    expect(feetTransformer.from('5.6')).toBe(5.6);
    expect(feetTransformer.from(null)).toBeNull();
  });

  it('accepts both local upload URLs and durable private-storage references', async () => {
    for (const url of ['http://localhost:3000/mock-storage/photo.jpg', 'media://users/u1/profile/photo.jpg']) {
      await expect(pipe.transform({ url }, { type: 'body', metatype: ProfilePhotoDto })).resolves.toMatchObject({ url });
    }
    await expect(pipe.transform({ url: 'javascript:alert(1)' }, { type: 'body', metatype: ProfilePhotoDto })).rejects.toThrow();
    await expect(pipe.transform({ url: 'ftp://example.com/photo.jpg' }, { type: 'body', metatype: ProfilePhotoDto })).rejects.toThrow();
  });
});
