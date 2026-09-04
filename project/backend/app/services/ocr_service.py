"""OCR service using Tesseract / EasyOCR.

Tesseract is used when available. If not installed, returns a clear error.
"""

import io
import re
from PIL import Image


def run_ocr(image_bytes: bytes) -> dict:
    try:
        import pytesseract
    except ImportError:
        return {
            "extracted_name": None,
            "extracted_document_number": None,
            "extracted_dob": None,
            "extracted_gender": None,
            "extracted_address": None,
            "extracted_expiry": None,
            "extracted_document_type": None,
            "ocr_confidence": 0,
            "raw_text": "",
            "status": "FAILED",
            "error": "Tesseract not installed on backend. Install pytesseract.",
        }

    img = Image.open(io.BytesIO(image_bytes))
    raw_text = pytesseract.image_to_string(img)

    # Extract common fields using regex patterns
    name = _extract_field(raw_text, [r"Name[:\s]+([A-Z][A-Z\s]+)", r"([A-Z][A-Z\s]{5,30})"])
    doc_num = _extract_field(raw_text, [r"Document\s*No[:\s]+([A-Z0-9]+)", r"([A-Z]{2,5}\d{6,10})"])
    dob = _extract_field(raw_text, [r"DOB[:\s]+(\d{2}/\d{2}/\d{4})", r"Date\s*of\s*Birth[:\s]+(\d{2}/\d{2}/\d{4})"])
    gender = _extract_field(raw_text, [r"Gender[:\s]+(Male|Female|MALE|FEMALE)", r"\b(MALE|FEMALE|Male|Female)\b"])
    address = _extract_field(raw_text, [r"Address[:\s]+([A-Za-z0-9\s,.-]+)"])

    # Confidence: rough estimate based on text length
    confidence = min(1.0, len(raw_text.strip()) / 500) if raw_text.strip() else 0

    return {
        "extracted_name": name,
        "extracted_document_number": doc_num,
        "extracted_dob": dob,
        "extracted_gender": gender,
        "extracted_address": address,
        "extracted_expiry": None,
        "extracted_document_type": None,
        "ocr_confidence": round(confidence, 2),
        "raw_text": raw_text.strip(),
        "status": "COMPLETED",
    }


def _extract_field(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None
