import { describe, expect, it } from "vitest";
import { dedupeRecipients } from "../src/services/recipients";

describe("dedupeRecipients", () => {
  it("dedupes case-insensitively and trims whitespace", () => {
    const result = dedupeRecipients(["a@b.com", "A@B.com ", " a@b.com"]);
    expect(result.deduped).toEqual(["a@b.com"]);
    expect(result.skippedInvalid).toBe(2);
  });

  it("skips invalid entries without throwing", () => {
    const result = dedupeRecipients(["not-an-email", "ok@example.com", ""]);
    expect(result.deduped).toEqual(["ok@example.com"]);
    expect(result.skippedInvalid).toBe(2);
  });

  it("returns an accurate count for a clean list", () => {
    const input = ["one@example.com", "two@example.com", "three@example.com"];
    const result = dedupeRecipients(input);
    expect(result.deduped).toHaveLength(3);
    expect(result.skippedInvalid).toBe(0);
  });
});
