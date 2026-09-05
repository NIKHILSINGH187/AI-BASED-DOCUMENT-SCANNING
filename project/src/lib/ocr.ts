
import Tesseract from 'tesseract.js';

export interface OcrExtractedData {
  extracted_name: string | null;
  extracted_document_number: string | null;
  extracted_dob: string | null;
  extracted_gender: string | null;
  extracted_address: string | null;
  extracted_expiry: string | null;
  extracted_document_type: string | null;
  extracted_nationality: string | null;
  visa_number: string | null;
  visa_type: string | null;
  entry_validation: string | null;
  stay_duration: string | null;
  mrz_data: Record<string, unknown> | null;
  mrz_valid: boolean | null;
  ocr_confidence: number;
  raw_text: string;
}

function findPattern(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  return null;
}

const NAME_LINE_DENYLIST = [
  'GOVERNMENT', 'INDIA', 'AADHAAR', 'AADHAR', 'UNIQUE', 'IDENTIFICATION', 'AUTHORITY',
  'MALE', 'FEMALE', 'OTHER', 'DOB', 'DATE', 'BIRTH', 'ADDRESS', 'DOWNLOAD', 'ONLINE',
  'AUTHENTICATION', 'SCANNING', 'PASSPORT', 'PERMANENT', 'ACCOUNT', 'ELECTION', 'VOTER',
  'LICENCE', 'LICENSE', 'DRIVING', 'INCOME', 'TAX', 'ISSUE', 'ISSUED', 'VALID', 'SIGNATURE',
  'REPUBLIC', 'DEPARTMENT', 'TRANSPORT', 'CARD', 'PROOF', 'CITIZENSHIP', 'VID', 'UIDAI',
  'HELP', 'WWW', 'GOV', 'PIN', 'STATE', 'DISTRICT', 'MOBILE', 'PHONE', 'EMAIL', 'VISA',
];

function guessNameFromLines(rawText: string): string | null {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const candidates: { line: string; score: number }[] = [];

  for (const line of lines) {
    if (/[0-9]/.test(line)) continue;
    if (!/^[A-Za-z][A-Za-z.\s]{2,39}$/.test(line)) continue;

    const upper = line.toUpperCase();
    if (NAME_LINE_DENYLIST.some((word) => upper.includes(word))) continue;

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 4) continue;

    if (words.every((w) => w.length < 3)) continue;
    if (words.some((w) => w.length < 2)) continue;

    const looksTitleOrUpperCase = words.every(
      (w) => /^[A-Z][a-z]*$/.test(w) || /^[A-Z]+$/.test(w),
    );
    if (!looksTitleOrUpperCase) continue;

    const formatted = line
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const totalLetters = words.join('').length;
    const score = totalLetters + words.length * 2;
    candidates.push({ line: formatted, score });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].line;
}

// ---------------------------------------------------------------------------
// MRZ (Machine Readable Zone) parsing — ICAO Doc 9303 TD3 format used on
// passport photo pages. This is the same two-line, 44-character-per-line
// format and check-digit algorithm real border/e-gate systems read, rather
// than relying only on a loose regex over the visual page text.
// ---------------------------------------------------------------------------

function mrzCharValue(c: string): number {
  if (c === '<') return 0;
  if (/[0-9]/.test(c)) return c.charCodeAt(0) - 48;
  if (/[A-Z]/.test(c)) return c.charCodeAt(0) - 55;
  return 0;
}

function mrzCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += mrzCharValue(input[i]) * weights[i % 3];
  }
  return sum % 10;
}

function formatMrzDate(yymmdd: string): string | null {
  if (!/^[0-9]{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const century = yy > 50 ? 1900 : 2000;
  return `${dd}/${mm}/${century + yy}`;
}

export interface MrzParseResult {
  valid: boolean;
  data: Record<string, unknown> | null;
}

function findMrzLines(rawText: string): [string, string] | null {
  const candidateLines = rawText
    .split('\n')
    .map((l) => l.toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 40 && l.length <= 46);

  for (let i = 0; i < candidateLines.length - 1; i++) {
    const l1 = candidateLines[i];
    const l2 = candidateLines[i + 1];
    if (l1.startsWith('P<') || /^P[A-Z<]/.test(l1)) {
      return [l1.padEnd(44, '<').slice(0, 44), l2.padEnd(44, '<').slice(0, 44)];
    }
  }
  return null;
}

function parseMRZ(rawText: string): MrzParseResult {
  const lines = findMrzLines(rawText);
  if (!lines) return { valid: false, data: null };
  const [line1, line2] = lines;

  const nationality = line1.slice(2, 5).replace(/</g, '');
  const namesPart = line1.slice(5).split('<<');
  const surname = (namesPart[0] || '').replace(/</g, ' ').trim();
  const givenNames = (namesPart[1] || '').replace(/</g, ' ').trim();

  const documentNumber = line2.slice(0, 9).replace(/</g, '');
  const documentNumberCheck = line2[9];
  const documentNumberValid = mrzCheckDigit(line2.slice(0, 9)).toString() === documentNumberCheck;

  const docNationality = line2.slice(10, 13).replace(/</g, '');
  const dobRaw = line2.slice(13, 19);
  const dobCheck = line2[19];
  const dobValid = mrzCheckDigit(dobRaw).toString() === dobCheck;

  const sex = line2[20];
  const expiryRaw = line2.slice(21, 27);
  const expiryCheck = line2[27];
  const expiryValid = mrzCheckDigit(expiryRaw).toString() === expiryCheck;

  const personalNumber = line2.slice(28, 42).replace(/</g, '');
  const finalCheckInput = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
  const finalCheck = line2[43];
  const finalValid = mrzCheckDigit(finalCheckInput).toString() === finalCheck;

  const overallValid = documentNumberValid && dobValid && expiryValid && finalValid;

  return {
    valid: overallValid,
    data: {
      method: 'ICAO 9303 TD3 MRZ parsing with check-digit validation',
      surname,
      given_names: givenNames,
      nationality: nationality || docNationality,
      document_number: documentNumber,
      document_number_check_valid: documentNumberValid,
      date_of_birth: formatMrzDate(dobRaw),
      date_of_birth_check_valid: dobValid,
      sex: sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Unspecified',
      date_of_expiry: formatMrzDate(expiryRaw),
      date_of_expiry_check_valid: expiryValid,
      personal_number: personalNumber || null,
      composite_check_valid: finalValid,
      overall_valid: overallValid,
    },
  };
}

export async function runOcr(imageData: string): Promise<OcrExtractedData> {
  const result = await Tesseract.recognize(imageData, 'eng+hin', {
    logger: () => {},
  });

  const text = result.data.text || '';
  const confidence = (result.data.confidence || 0) / 100;
  const upperText = text.toUpperCase();

  const namePatterns = [
    /(?:NAME|नाम)\s*[:\-]?\s*([A-Z][A-Z\s]{2,40})/i,
    /(?:Name)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,40})/,
  ];
  let extracted_name = findPattern(text, namePatterns) || guessNameFromLines(text);

  const docNumberPatterns = [
    /(?:AADHAAR|AADHAR|UID)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([0-9]{4}\s?[0-9]{4}\s?[0-9]{4})/i,
    /(?:PAN|P\.A\.N\.?)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i,
    /(?:VOTER|EPIC|ELECTION)\s*(?:NO|NUMBER|NUM|ID)?\s*[:\-]?\s*([A-Z0-9]{6,12})/i,
    /(?:PASSPORT)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z][0-9]{7})/i,
    /(?:VISA)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z0-9]{6,12})/i,
    /(?:DL|DRIVING\s*LICEN[CS]E)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z0-9\s\-]{6,20})/i,
    /([A-Z]{5}[0-9]{4}[A-Z])/,
    /([0-9]{4}\s?[0-9]{4}\s?[0-9]{4})/,
  ];
  let extracted_document_number = findPattern(upperText, docNumberPatterns);

  const dobPatterns = [
    /(?:DOB|DATE\s*OF\s*BIRTH|जन्म\s*तिथि)\s*[:\-]?\s*([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{4})/i,
    /([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{4})/,
  ];
  let extracted_dob = findPattern(text, dobPatterns);

  const genderPatterns = [
    /(?:GENDER|SEX|लिंग)\s*[:\-]?\s*(MALE|FEMALE|OTHER|M|F|पुरुष|महिला)/i,
    /\b(MALE|FEMALE|OTHER)\b/i,
  ];
  let extracted_gender = findPattern(upperText, genderPatterns);

  const addressPatterns = [
    /(?:ADDRESS|पता)\s*[:\-]?\s*([A-Z0-9\s,.\-\/#()]{10,200})/i,
  ];
  const extracted_address = findPattern(upperText, addressPatterns);

  const expiryPatterns = [
    /(?:EXPIRY|EXPIRES|VALID\s*UNTIL|VALID\s*TO|DATE\s*OF\s*EXPIRY)\s*[:\-]?\s*([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{4})/i,
  ];
  let extracted_expiry = findPattern(text, expiryPatterns);

  let extracted_document_type: string | null = null;
  if (/AADHAAR|AADHAR|UID/i.test(upperText)) extracted_document_type = 'Aadhaar';
  else if (/PAN|PERMANENT\s*ACCOUNT/i.test(upperText)) extracted_document_type = 'PAN';
  else if (/VOTER|EPIC|ELECTION/i.test(upperText)) extracted_document_type = 'Voter ID';
  else if (/VISA/i.test(upperText) && !/PASSPORT/i.test(upperText)) extracted_document_type = 'Visa';
  else if (/PASSPORT/i.test(upperText)) extracted_document_type = 'Passport';
  else if (/DRIVING\s*LICEN[CS]E|\bDL\b/i.test(upperText)) extracted_document_type = 'Driving Licence';

  let extracted_nationality: string | null = null;
  let mrz_data: Record<string, unknown> | null = null;
  let mrz_valid: boolean | null = null;

  if (extracted_document_type === 'Passport') {
    const mrzResult = parseMRZ(text);
    mrz_data = mrzResult.data;
    mrz_valid = mrzResult.data ? mrzResult.valid : null;

    if (mrzResult.data) {
      const d = mrzResult.data as Record<string, string | boolean | null>;
      if (d.surname || d.given_names) {
        extracted_name = `${d.given_names || ''} ${d.surname || ''}`.trim();
      }
      if (d.document_number) extracted_document_number = d.document_number as string;
      if (d.date_of_birth) extracted_dob = d.date_of_birth as string;
      if (d.date_of_expiry) extracted_expiry = d.date_of_expiry as string;
      if (d.sex) extracted_gender = (d.sex as string).toUpperCase();
      if (d.nationality) extracted_nationality = d.nationality as string;
    }

    if (!extracted_nationality) {
      const natMatch = findPattern(upperText, [
        /(?:NATIONALITY)\s*[:\-]?\s*([A-Z]{3,20})/i,
      ]);
      extracted_nationality = natMatch;
    }
  }

  let visa_number: string | null = null;
  let visa_type: string | null = null;
  let entry_validation: string | null = null;
  let stay_duration: string | null = null;

  if (extracted_document_type === 'Visa') {
    visa_number = findPattern(upperText, [
      /(?:VISA\s*(?:NO|NUMBER|NUM)?)\s*[:\-]?\s*([A-Z0-9]{6,12})/i,
    ]);
    visa_type = findPattern(upperText, [
      /(?:TYPE\s*OF\s*VISA|VISA\s*TYPE|CATEGORY)\s*[:\-]?\s*([A-Z\-]{1,20})/i,
      /\b(TOURIST|BUSINESS|EMPLOYMENT|STUDENT|TRANSIT|MEDICAL|CONFERENCE|DIPLOMATIC)\b/i,
    ]);
    entry_validation = findPattern(upperText, [
      /\b(SINGLE\s*ENTRY|MULTIPLE\s*ENTRY|DOUBLE\s*ENTRY)\b/i,
    ]);
    stay_duration = findPattern(upperText, [
      /(?:DURATION\s*OF\s*STAY|LENGTH\s*OF\s*STAY|STAY\s*UP\s*TO)\s*[:\-]?\s*([0-9]{1,3}\s*(?:DAYS?|MONTHS?|YEARS?))/i,
    ]);
  }

  return {
    extracted_name,
    extracted_document_number,
    extracted_dob,
    extracted_gender,
    extracted_address,
    extracted_expiry,
    extracted_document_type,
    extracted_nationality,
    visa_number,
    visa_type,
    entry_validation,
    stay_duration,
    mrz_data,
    mrz_valid,
    ocr_confidence: confidence,
    raw_text: text,
  };
}
