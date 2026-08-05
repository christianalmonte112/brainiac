import { describe, expect, it } from "vitest";
import { scaledDimensions } from "./compressPageImage";

describe("scaledDimensions", () => {
  it("leaves already-small images alone", () => {
    expect(scaledDimensions(1200, 1600, 2048)).toEqual({ width: 1200, height: 1600 });
  });

  it("scales down a tall phone page photo", () => {
    expect(scaledDimensions(4284, 5712, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("scales down a wide image", () => {
    expect(scaledDimensions(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 });
  });
});

