/** Only explicitly labelled values are mapped; unknown/missing values stay empty. */
export function parseBiodata(text: string): Record<string, string> {
  const aliases: Record<string, string> = {
    name: 'displayName', 'full name': 'displayName', 'date of birth': 'dateOfBirth', dob: 'dateOfBirth',
    mobile: 'contactPhone', phone: 'contactPhone', 'mobile number': 'contactPhone', email: 'contactEmail',
    gender: 'gender', city: 'city', location: 'city', religion: 'religion', caste: 'caste',
    'sub caste': 'subCaste', subcaste: 'subCaste', 'mother tongue': 'motherTongue', education: 'highestQualification',
    qualification: 'highestQualification', occupation: 'profession', profession: 'profession',
    'first name': 'firstName', 'last name': 'lastName', 'native place': 'nativePlace',
    surname: 'lastName', 'birth date': 'dateOfBirth', sex: 'gender',
    'contact number': 'contactPhone', 'phone number': 'contactPhone', 'contact email': 'contactEmail',
    height: 'heightCm', 'height cm': 'heightCm', complexion: 'complexion',
    address: 'communicationAddress', 'communication address': 'communicationAddress',
    'alternate mobile': 'alternateMobile', 'native state': 'nativeState',
    'native country': 'nativeCountry', 'native district': 'nativeDistrict',
    denomination: 'denomination', 'marital status': 'maritalStatus',
    father: 'fatherName', 'father name': 'fatherName', 'fathers name': 'fatherName',
    mother: 'motherName', 'mother name': 'motherName', 'mothers name': 'motherName',
    'father occupation': 'fatherProfession', 'father profession': 'fatherProfession',
    'fathers occupation': 'fatherProfession', 'fathers profession': 'fatherProfession',
    'mother occupation': 'motherProfession', 'mother profession': 'motherProfession',
    'mothers occupation': 'motherProfession', 'mothers profession': 'motherProfession',
    'family type': 'familyType', 'family status': 'familyStatus', brothers: 'brothers', sisters: 'sisters', siblings: 'siblings',
    'highest qualification': 'highestQualification', course: 'course',
    institution: 'institution', college: 'institution', university: 'institution', 'college place': 'collegePlace',
    employer: 'company', company: 'company', designation: 'designation',
    'occupation status': 'occupationStatus', 'work location': 'workLocation',
    'annual income': 'annualIncome', salary: 'salary',
    rashi: 'rashi', rasi: 'rashi', star: 'star', nakshatra: 'star', nakshatram: 'star',
    padam: 'padam', pada: 'padam', gothram: 'gothram', gotra: 'gothram', gothra: 'gothram',
    'kuja dosham': 'kujaDosham', 'manglik': 'kujaDosham',
    'time of birth': 'timeOfBirth', 'birth time': 'timeOfBirth',
    'place of birth': 'placeOfBirth', 'birth place': 'placeOfBirth', 'about me': 'bio',
  };
  const result: Record<string, string> = {};
  const labels = Object.keys(aliases).sort((a, b) => b.length - a.length)
    .map(label => label.replace(/ /g, '[ .-]+')).join('|');
  // OCR commonly separates every character in D.O.B. Preserve the familiar
  // abbreviation before looking for labels, so it maps just like "DOB".
  text = text.replace(/\bd\s*\.?\s*o\s*\.?\s*b\.?\s*(?=[:\uFF1A\-\u2013\u2014])/gi, 'DOB');
  text = text
    .replace(/([a-z])['’]s(?=\s+(?:name|occupation|profession))/gi, '$1s')
    .replace(new RegExp(`(^|[\\r\\n \\t|]+)(${labels})\\s*[\\-\\u2013\\u2014]`, 'gi'), '$1$2:');
  const lines = text.replace(/([a-z])['’]s(?=\s+(?:name|occupation|profession))/gi, '$1s')
    .replace(new RegExp(`(^|[\\r\\n \\t|]+)(${labels})\\s*[:\\uFF1A]`, 'gi'), '\n$2:')
    .replace(/[:\uFF1A][ \t]*\r?\n[ \t]*(?=[^\r\n:]+(?:\r?\n|$))/g, ': ');
  for (const line of lines.split(/[\r\n]+/)) {
    const match = line.match(/^\s*([a-z .'’()-]+?)\s*[:\uFF1A]\s*(\S.*?)\s*$/i);
    if (!match) continue;
    const key = aliases[match[1].trim().toLowerCase().replace(/[.'’()]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ')];
    if (!key || result[key]) continue;
    let value = match[2].trim().replace(/\s*\|$/, '').trim();
    if (/^(?:n\/?a|not specified|unknown|[-—]+)$/i.test(value)) continue;
    if (key === 'dateOfBirth') {
      const normalised = parseDateOfBirth(value);
      if (!normalised) continue;
      value = normalised;
    }
    if (key === 'contactPhone' || key === 'alternateMobile') {
      value = value.replace(/[\s()-]/g, '').replace(/^\+91/, '');
      if (!/^[6-9]\d{9}$/.test(value)) continue;
    }
    if (key === 'gender') {
      value = value.toLowerCase();
      if (!['male', 'female', 'other'].includes(value)) continue;
    }
    if (key === 'contactEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) continue;
    if (key === 'heightCm') {
      const cm = value.match(/^(\d{2,3}(?:\.\d+)?)\s*(?:cm|cms|centimeters|centimetres)?$/i);
      const feet = value.match(/^(\d)\s*(?:ft|feet|')\s*(\d{1,2})?\s*(?:in|inches|")?$/i);
      const height = cm ? Number(cm[1]) : feet && Number(feet[2] || 0) < 12
        ? (Number(feet[1]) * 12 + Number(feet[2] || 0)) * 2.54 : NaN;
      if (!Number.isFinite(height) || height < 50 || height > 250) continue;
      value = String(Math.round(height));
    }
    if (key === 'siblings') {
      const brothers = value.match(/\b(\d{1,2})\s+brothers?\b/i);
      const sisters = value.match(/\b(\d{1,2})\s+sisters?\b/i);
      if (brothers) result.brothers = brothers[1];
      if (sisters) result.sisters = sisters[1];
      continue;
    }
    if (key === 'brothers' || key === 'sisters') {
      if (!/^\d{1,2}$/.test(value)) continue;
    }
    result[key] = value;
  }
  if (result.displayName && !result.firstName && !result.lastName) {
    const [first, ...rest] = result.displayName.split(/\s+/);
    result.firstName = first;
    if (rest.length) result.lastName = rest.join(' ');
  }
  if (!result.displayName && (result.firstName || result.lastName)) {
    result.displayName = [result.firstName, result.lastName].filter(Boolean).join(' ');
  }
  return result;
}

/** Converts only unambiguous, explicitly labelled Indian biodata dates to ISO. */
function parseDateOfBirth(value: string): string | undefined {
  const numeric = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  let day: number;
  let month: number;
  let year: number;
  if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    year = Number(numeric[3]);
  } else {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const dayFirst = value.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s*,?\s+(\d{4})$/i);
    const monthFirst = value.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s+(\d{4})$/i);
    const parts = dayFirst ?? monthFirst;
    if (!parts) return undefined;
    const monthName = (dayFirst ? parts[2] : parts[1]).toLowerCase();
    month = months.indexOf(monthName) + 1;
    day = Number(dayFirst ? parts[1] : parts[2]);
    year = Number(parts[3]);
  }
  if (!month || !day || !year) return undefined;
  const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : undefined;
}

export async function readBiodata(file: File): Promise<Record<string, string>> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose a file under 10 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!(pdf || png || jpeg)) throw new Error('Choose a valid PDF, JPG or PNG file.');
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | undefined;
  const ocr = async (source: File | HTMLCanvasElement) => {
    worker ??= await (await import('tesseract.js')).createWorker('eng');
    const { data } = await worker.recognize(source);
    if (data.confidence < 60) throw new Error('This scan is not clear enough to import reliably. Use a clearer image or enter the details manually.');
    return data.text;
  };
  let text = '';
  try {
    if (pdf) {
      const lib = await import('pdfjs-dist');
      lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
      const doc = await lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
      try {
        if (doc.numPages > 10) throw new Error('Choose a biodata PDF with at most 10 pages.');
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          let pageText = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
          if (!Object.keys(parseBiodata(pageText)).length) {
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(2, 2400 / Math.max(base.width, base.height)) });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('This browser cannot render the PDF for text recognition.');
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            pageText = await ocr(canvas);
            canvas.width = canvas.height = 0;
          }
          text += pageText + '\n';
          page.cleanup();
        }
      } finally { await doc.destroy(); }
    } else text = await ocr(file);
  } finally { await worker?.terminate(); }
  const fields = parseBiodata(text);
  if (!Object.keys(fields).length) throw new Error('Unable to extract the details from this document. Please enter the details manually.');
  return fields;
}
