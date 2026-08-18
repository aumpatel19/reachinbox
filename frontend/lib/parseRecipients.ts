import Papa from "papaparse";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParseRecipientsResult {
  emails: string[];
  invalidCount: number;
}

export function parseRecipientsFromText(text: string): ParseRecipientsResult {
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });

  const candidates = (data as string[][]).flat().map((cell) => cell.trim().toLowerCase());

  const seen = new Set<string>();
  const emails: string[] = [];
  let invalidCount = 0;

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!EMAIL_RE.test(candidate)) {
      invalidCount += 1;
      continue;
    }
    if (seen.has(candidate)) {
      invalidCount += 1;
      continue;
    }
    seen.add(candidate);
    emails.push(candidate);
  }

  return { emails, invalidCount };
}

export function parseRecipientsFromFile(file: File): Promise<ParseRecipientsResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseRecipientsFromText(String(reader.result ?? "")));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
