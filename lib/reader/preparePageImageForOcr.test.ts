import { describe, expect, it } from "vitest";
import { findContentBounds } from "./preparePageImageForOcr";

function rgbaFrame(
  width: number,
  height: number,
  fill: [number, number, number],
  inkRect?: { x: number; y: number; w: number; h: number },
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    data[o] = fill[0];
    data[o + 1] = fill[1];
    data[o + 2] = fill[2];
    data[o + 3] = 255;
  }
  if (inkRect) {
    for (let y = inkRect.y; y < inkRect.y + inkRect.h; y++) {
      for (let x = inkRect.x; x < inkRect.x + inkRect.w; x++) {
        const o = (y * width + x) * 4;
        data[o] = 20;
        data[o + 1] = 20;
        data[o + 2] = 20;
      }
    }
  }
  return data;
}

describe("findContentBounds", () => {
  it("returns a padded bbox around dark ink on a light field", () => {
    const width = 200;
    const height = 200;
    const data = rgbaFrame(width, height, [250, 250, 250], { x: 40, y: 30, w: 100, h: 120 });
    const bounds = findContentBounds(data, width, height);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeLessThanOrEqual(40);
    expect(bounds!.y).toBeLessThanOrEqual(30);
    expect(bounds!.x + bounds!.width).toBeGreaterThanOrEqual(140);
    expect(bounds!.y + bounds!.height).toBeGreaterThanOrEqual(150);
    // Should crop away empty margins (not full frame).
    expect(bounds!.width * bounds!.height).toBeLessThan(width * height * 0.96);
  });

  it("returns null when the frame is almost empty", () => {
    const data = rgbaFrame(100, 100, [255, 255, 255]);
    expect(findContentBounds(data, 100, 100)).toBeNull();
  });
});
