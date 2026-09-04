
import Tesseract from 'tesseract.js';

export interface OcrExtractedData {
  extracted_name: string | null;
  extracted_document_number: string | null;
  extracted_dob: string | null;
  extracted_gender: string | null;
  extracted_address: string | null;
  extracted_expiry: string | null;
  extracted_document_type: string | null;
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
  'HELP', 'WWW', 'GOV', 'PIN', 'STATE', 'DISTRICT', 'MOBILE', 'PHONE', 'EMAIL',
];

function guessNameFromLines(rawText: string): string | null {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    if (/[0-9]/.test(line)) continue;
    if (!/^[A-Za-z][A-Za-z.\s]{2,39}$/.test(line)) continue;

    const upper = line.toUpperCase();
    if (NAME_LINE_DENYLIST.some((word) => upper.includes(word))) continue;

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 4) continue;
    if (words.some((w) => w.length < 2)) continue;

    const looksTitleOrUpperCase = words.every(
      (w) => /^[A-Z][a-z]*$/.test(w) || /^[A-Z]+$/.test(w),
    );
    if (!looksTitleOrUpperCase) continue;

    return line
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return null;
}

export async function runOcr(imageData: string): Promise<OcrExtractedData> {
  const result = await Tesseract.recognize(imageData, 'eng', {
    logger: () => {},
  });

  const text = result.data.text || '';
  const confidence = (result.data.confidence || 0) / 100;

  const upperText = text.toUpperCase();

  const namePatterns = [
    /(?:NAME|नाम)\s*[:\-]?\s*([A-Z][A-Z\s]{2,40})/i,
    /(?:Name)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,40})/,
  ];
  const extracted_name = findPattern(text, namePatterns) || guessNameFromLines(text);

  const docNumberPatterns = [
    /(?:AADHAAR|AADHAR|UID)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([0-9]{4}\s?[0-9]{4}\s?[0-9]{4})/i,
    /(?:PAN|P\.A\.N\.?)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i,
    /(?:VOTER|EPIC|ELECTION)\s*(?:NO|NUMBER|NUM|ID)?\s*[:\-]?\s*([A-Z0-9]{6,12})/i,
    /(?:PASSPORT)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z][0-9]{7})/i,
    /(?:DL|DRIVING\s*LICEN[CS]E)\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z0-9\s\-]{6,20})/i,
    /([A-Z]{5}[0-9]{4}[A-Z])/,
    /([0-9]{4}\s?[0-9]{4}\s?[0-9]{4})/,
  ];
  const extracted_document_number = findPattern(upperText, docNumberPatterns);

  const dobPatterns = [
    /(?:DOB|DATE\s*OF\s*BIRTH|जन्म\s*तिथि)\s*[:\-]?\s*([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{4})/i,
    /([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{4})/,
  ];
  const extracted_dob = findPattern(text, dobPatterns);

  const genderPatterns = [
    /(?:GENDER|लिंग)\s*[:\-]?\s*(MALE|FEMALE|OTHER|M|F|पुरुष|महिला)/i,
    /\b(MALE|FEMALE|OTHER)\b/i,
  ];
  const extracted_gender = findPattern(upperText, genderPatterns);

  const addressPatterns = [
    /(?:ADDRESS|पता)\s*[:\-]?\s*([A-Z0-9\s,.\-\/#()]{10,200})/i,
  ];
  const extracted_address = findPattern(upperText, addressPatterns);

  const expiryPatterns = [
    /(?:EXPIRY|EXPIRES|VALID\s*UNTIL|VALID\s*TO)\s*[:\-]?\s*([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{4})/i,
  ];
  const extracted_expiry = findPattern(text, expiryPatterns);

  let extracted_document_type: string | null = null;
  if (/AADHAAR|AADHAR|UID/i.test(upperText)) extracted_document_type = 'Aadhaar';
  else if (/PAN|PERMANENT\s*ACCOUNT/i.test(upperText)) extracted_document_type = 'PAN';
  else if (/VOTER|EPIC|ELECTION/i.test(upperText)) extracted_document_type = 'Voter ID';
  else if (/PASSPORT/i.test(upperText)) extracted_document_type = 'Passport';
  else if (/DRIVING\s*LICEN[CS]E|\bDL\b/i.test(upperText)) extracted_document_type = 'Driving Licence';

  return {
    extracted_name,
    extracted_document_number,
    extracted_dob,
    extracted_gender,
    extracted_address,
    extracted_expiry,
    extracted_document_type,
    ocr_confidence: confidence,
    raw_text: text,
  };
}
