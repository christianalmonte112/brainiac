import { describe, expect, it } from "vitest";
import { READING_SOURCES } from "./catalog";
import { filterReadingSources } from "./filter";
import { readingSourceBody, trimToWordBudget } from "./wikipedia";
import { countWords } from "../text/word-count";

describe("filterReadingSources", () => {
  it("shows the selected topic when the search is empty", () => {
    const science = filterReadingSources("science", "");
    expect(science.length).toBeGreaterThan(0);
    expect(science.every((source) => source.topic === "science")).toBe(true);
  });

  it("searches the whole shelf, not only the selected topic", () => {
    const matches = filterReadingSources("history", "black holes");
    expect(matches.map((source) => source.id)).toContain("black-hole");
  });

  it("finds the Federal Reserve from a fuller phrase", () => {
    const matches = filterReadingSources("ideas", "the Federal Reserve");
    expect(matches.map((source) => source.id)).toEqual(["federal-reserve"]);
  });

  it("uses a shared subject so one piece leads to the next", () => {
    const blackHole = READING_SOURCES.find((source) => source.id === "black-hole");
    expect(blackHole).toBeDefined();
    const related = filterReadingSources("history", blackHole!.subject);
    expect(related.map((source) => source.id).sort()).toEqual(["black-hole", "solar-system"]);
  });
});

describe("trimToWordBudget", () => {
  it("keeps whole paragraphs until the budget is reached", () => {
    const text = `${"alpha ".repeat(40)}\n\n${"beta ".repeat(40)}\n\n${"gamma ".repeat(40)}`;
    const trimmed = trimToWordBudget(text, 50);
    expect(countWords(trimmed)).toBeLessThanOrEqual(50);
    expect(trimmed.startsWith("alpha")).toBe(true);
    expect(trimmed.includes("gamma")).toBe(false);
  });
});

describe("readingSourceBody", () => {
  it("credits Wikipedia and keeps the opening", () => {
    const body = readingSourceBody("Black hole", "https://en.wikipedia.org/wiki/Black_hole", "A black hole is a region of spacetime.\n\nNothing escapes.");
    expect(body).toContain("CC BY-SA");
    expect(body).toContain("https://en.wikipedia.org/wiki/Black_hole");
    expect(body).toContain("A black hole is a region of spacetime.");
  });
});
