import { describe, expect, it, vi } from "vitest";
import { resolveWordLookup, type WordLookupResult } from "./dictionary";

function fakeResult(word: string): WordLookupResult {
  return {
    word,
    partOfSpeech: "noun",
    phonetic: null,
    definition: `definition of ${word}`,
    etymology: null,
    synonyms: [],
  };
}

describe("resolveWordLookup — fallback orchestration", () => {
  it("returns the primary result and never calls the fallback when the primary succeeds", async () => {
    const primary = vi.fn().mockResolvedValue(fakeResult("cat"));
    const fallback = vi.fn().mockResolvedValue(fakeResult("cat"));

    const result = await resolveWordLookup("cat", primary, fallback);

    expect(result).toEqual(fakeResult("cat"));
    expect(fallback).not.toHaveBeenCalled();
  });

  it("calls the fallback when the primary reports no entry, and returns its result", async () => {
    const primary = vi.fn().mockResolvedValue(null);
    const fallback = vi.fn().mockResolvedValue(fakeResult("stigmergy"));

    const result = await resolveWordLookup("stigmergy", primary, fallback);

    expect(fallback).toHaveBeenCalledWith("stigmergy");
    expect(result).toEqual(fakeResult("stigmergy"));
  });

  it("returns null when both the primary and the fallback report no entry", async () => {
    const primary = vi.fn().mockResolvedValue(null);
    const fallback = vi.fn().mockResolvedValue(null);

    const result = await resolveWordLookup("asdfqwerty", primary, fallback);

    expect(result).toBeNull();
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("propagates a primary-lookup error rather than silently falling back on a real failure (not the same as a clean 404 miss)", async () => {
    const primary = vi.fn().mockRejectedValue(new Error("Dictionary lookup failed with status 500."));
    const fallback = vi.fn();

    await expect(resolveWordLookup("word", primary, fallback)).rejects.toThrow("status 500");
    expect(fallback).not.toHaveBeenCalled();
  });
});
