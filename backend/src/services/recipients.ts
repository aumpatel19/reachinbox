export interface DedupeResult {
  deduped: string[];
  skippedInvalid: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims, lowercases, validates, and dedupes a raw recipient list. */
export function dedupeRecipients(raw: string[]): DedupeResult {
  const seen = new Set<string>();
  let skippedInvalid = 0;

  for (const entry of raw) {
    const normalized = entry.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      skippedInvalid++;
      continue;
    }
    if (seen.has(normalized)) {
      skippedInvalid++;
      continue;
    }
    seen.add(normalized);
  }

  return { deduped: Array.from(seen), skippedInvalid };
}
