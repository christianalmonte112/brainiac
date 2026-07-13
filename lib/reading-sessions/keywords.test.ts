import { describe, expect, it } from "vitest";
import { extractCandidateKeywords } from "./keywords";

describe("extractCandidateKeywords", () => {
  it("returns empty array for undefined text", () => {
    expect(extractCandidateKeywords(undefined)).toEqual([]);
  });

  it("filters stopwords/short words and deduplicates case-insensitively", () => {
    const text = "This section explains Memory systems and memory retrieval with context and insight.";
    expect(extractCandidateKeywords(text, 10)).toEqual([
      "section",
      "explains",
      "Memory",
      "systems",
      "retrieval",
      "context",
      "insight",
    ]);
  });

  it("respects max candidate limit", () => {
    const text = "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda";
    expect(extractCandidateKeywords(text, 3)).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});
