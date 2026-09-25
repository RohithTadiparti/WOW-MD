import { describe, expect, it } from 'vitest';
import { parseBiodata, readBiodata } from './biodata-import';

describe('biodata document extraction', () => {
  it('maps the complete example and all supported sections', () => {
    expect(parseBiodata(`Name: Rahul Kumar
DOB: 15/08/1998
Gender: Male
Religion: Hindu
Caste: Kamma
Sub-caste: Example
Mother Tongue: Telugu
Education: B.Tech
Occupation: Software Engineer
Employer: Example Ltd
Course: Computer Science
Native Place: Hyderabad
City: Hyderabad
Father: Ramesh
Mother: Lakshmi
Family Type: Nuclear
Height: 175 cm
Mobile: 9876543210
Address: Hyderabad
Rashi: Mesha
Star: Ashwini
Padam: 2
Gothram: Example
Kuja Dosham: No
Time of Birth: 06:30
Place of Birth: Hyderabad`)).toEqual({
      displayName: 'Rahul Kumar', firstName: 'Rahul', lastName: 'Kumar',
      dateOfBirth: '1998-08-15', gender: 'male', religion: 'Hindu', caste: 'Kamma',
      subCaste: 'Example', motherTongue: 'Telugu', highestQualification: 'B.Tech',
      profession: 'Software Engineer', company: 'Example Ltd', course: 'Computer Science',
      nativePlace: 'Hyderabad', city: 'Hyderabad', fatherName: 'Ramesh', motherName: 'Lakshmi',
      familyType: 'Nuclear', heightCm: '175', contactPhone: '9876543210',
      communicationAddress: 'Hyderabad', rashi: 'Mesha', star: 'Ashwini', padam: '2',
      gothram: 'Example', kujaDosham: 'No', timeOfBirth: '06:30', placeOfBirth: 'Hyderabad',
    });
  });

  it('handles columns, line-separated labels, apostrophes and feet/inches', () => {
    expect(parseBiodata(`Name: Rahul Kumar   Gender: Male
Education:
B.Tech
Father's Name: Ramesh
Height: 5 ft 9 in`)).toMatchObject({ displayName: 'Rahul Kumar', gender: 'male',
      highestQualification: 'B.Tech', fatherName: 'Ramesh', heightCm: '175' });
  });

  it('handles biodata label variants, written dates, continued values and sibling counts', () => {
    expect(parseBiodata(`Full Name - Anjali Devi
D.O.B:
5th April 1998
Height: 5' 2"
Father's Name: Srinivas
Father's Occupation: Farmer
Mother's Name: Padma
Mother's Occupation: Teacher
Rasi: Kanya
Nakshatram: Hasta
Siblings: 1 Brother, 2 Sisters`)).toMatchObject({
      displayName: 'Anjali Devi', firstName: 'Anjali', lastName: 'Devi',
      dateOfBirth: '1998-04-05', heightCm: '157', fatherName: 'Srinivas',
      fatherProfession: 'Farmer', motherName: 'Padma', motherProfession: 'Teacher',
      rashi: 'Kanya', star: 'Hasta', brothers: '1', sisters: '2',
    });
  });

  it('leaves missing and malformed values empty without guessing from other fields', () => {
    expect(parseBiodata(`Native Place: Hyderabad
DOB: 31/02/1998
Mobile: 123
Height: tall
Brothers: several
Email: invalid
Gender: unknown
Religion: N/A`)).toEqual({ nativePlace: 'Hyderabad' });
  });

  it('rejects unsupported files before trying OCR or uploading', async () => {
    const bytes = new TextEncoder().encode('not an image');
    const file = { size: bytes.length, arrayBuffer: async () => bytes.buffer } as File;
    await expect(readBiodata(file)).rejects.toThrow('valid PDF, JPG or PNG');
  });
});
