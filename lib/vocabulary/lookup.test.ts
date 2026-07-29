import { describe, expect, it, vi, beforeEach } from "vitest";
import { lookupWordWithFallback } from "./lookup";
import type { WordLookupResult } from "./dictionary";

vi.mock("./dictionary", () => ({
  lookupWord: vi.fn(),
}));

vi.mock("@/lib/prompts/vocabularyLookup", () => ({
  lookupWordWithClaude: vi.fn(),
}));

import { lookupWord } from "./dictionary";
import { lookupWordWithClaude } from "@/lib/prompts/vocabularyLookup";

const mockDictionary = vi.mocked(lookupWord);
const mockClaude = vi.mocked(lookupWordWithClaude);

const sampleEntry: WordLookupResult = {
  word: "octopus",
  partOfSpeech: "noun",
  phonetic: "/ˈɒktəpəs/",
  definition: "A sea animal with eight arms.",
  etymology: "From Greek oktō + pous.",
  synonyms: ["cephalopod"],
};

describe("lookupWordWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the dictionary result when the free API has an entry", async () => {
    mockDictionary.mockResolvedValue(sampleEntry);

    await expect(lookupWordWithFallback("octopus")).resolves.toEqual(sampleEntry);
    expect(mockClaude).not.toHaveBeenCalled();
  });

  it("falls back to Claude when the free dictionary API has no entry", async () => {
    mockDictionary.mockResolvedValue(null);
    mockClaude.mockResolvedValue({
      ...sampleEntry,
      word: "den",
      definition: "A hidden home or shelter, especially for an animal.",
    });

    const result = await lookupWordWithFallback("den");

    expect(mockClaude).toHaveBeenCalledWith("den");
    expect(result?.definition).toContain("home");
  });

  it("returns null when both the dictionary API and Claude fail", async () => {
    mockDictionary.mockResolvedValue(null);
    mockClaude.mockResolvedValue(null);

    await expect(lookupWordWithFallback("zzzznotaword")).resolves.toBeNull();
  });

  it("does not call Claude when the dictionary lookup succeeds", async () => {
    mockDictionary.mockResolvedValue(sampleEntry);

    await lookupWordWithFallback("octopus");

    expect(mockDictionary).toHaveBeenCalledWith("octopus");
    expect(mockClaude).not.toHaveBeenCalled();
  });
});
