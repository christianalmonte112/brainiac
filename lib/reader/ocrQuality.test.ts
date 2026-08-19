import { describe, expect, it } from "vitest";
import { looksLikeGarbageOcr } from "./ocrQuality";

describe("looksLikeGarbageOcr", () => {
  it("flags punctuation soup", () => {
    expect(
      looksLikeGarbageOcr(
        "4 » « [2 }.. 4 © ¥ ; 4 ) ) , 3 , ¥¢ \\ . 4 . ]] 0% > . ” 51 . [ . 0 / 5",
      ),
    ).toBe(true);
  });

  it("accepts normal prose", () => {
    expect(
      looksLikeGarbageOcr(
        "I don't know what it was about us but we had something, and we felt it. You could see it in the way we walked and talked.",
      ),
    ).toBe(false);
  });
});
