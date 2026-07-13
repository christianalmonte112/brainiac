import { describe, expect, it } from "vitest";
import { localDateString } from "./timezone";

describe("localDateString", () => {
  it("formats a date in the requested timezone", () => {
    const date = new Date("2026-07-13T00:30:00.000Z");
    expect(localDateString(date, "America/Los_Angeles")).toBe("2026-07-12");
  });

  it("falls back to UTC date string for invalid timezones", () => {
    const date = new Date("2026-07-13T00:30:00.000Z");
    expect(localDateString(date, "Not/A_Real_TZ")).toBe("2026-07-13");
  });
});
