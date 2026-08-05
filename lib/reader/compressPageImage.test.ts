import { describe, expect, it } from "vitest";
import { scaledDimensions } from "./compressPageImage";

describe("scaledDimensions", () => {
  it("leaves already-small images alone", () => {
    expect(scaledDimensions(1200, 1600, 2048)).toEqual({ width: 1200, height: 1600 });
  });

  it("scales down a tall phone page photo", () => {
    expect(scaledDimensions(4284, 5712, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  it("scales down a wide image", () => {
    expect(scaledDimensions(4000, 2000, 2048)).toEqual({ width: 2048, height: 1024 });
  });
});
