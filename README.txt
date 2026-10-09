MCE Examination Portal — Automatic File-to-Test patch

REPLACE / ADD THESE FILES:
1) Replace: src/components/admin/CreateTestStudio.tsx
2) Add:     src/services/automaticQuestionImport.ts
3) Replace: src/services/pdfParser.ts (includes a small PDF.js type compatibility cast; parsing flow is preserved)

No package.json dependency changes are required.

SUPPORTED INPUTS:
- PDF with selectable text
- Scanned PDF (OCR fallback, up to first 20 pages)
- Word DOCX (old binary .doc is not supported)
- Excel XLSX/XLSM
- CSV, TXT, JSON
- JPG, PNG, WEBP images (OCR)

OCR NOTE:
For scanned PDFs and images, the browser loads Tesseract.js and English/Hindi language data from public CDNs on first use. Internet access is required for OCR. If the network blocks these CDNs, OCR will show an error rather than pretending the file was processed.

VALIDATION:
The import flow blocks publishing if the question/options/answer key parser reports issues. It does not guess missing answers. Fix the source file and upload again. For table files, use the existing CSV template.

SAVE/PUBLISH:
The feature uses the existing ExamTest and Question types and calls storage.saveTest(test), then invokes the existing onTestPublished callback only after the save resolves.
