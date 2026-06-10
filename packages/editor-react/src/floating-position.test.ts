import { describe, expect, it } from "vitest";
import {
  belowFloatingPoint,
  centeredFloatingPoint,
  clamp,
  clampFloatingPoint,
  finitePoint,
  nearbyFloatingPoint,
  sideHandlePoint,
  viewportPoint,
  type RectLike,
} from "./floating-position";

const container: RectLike & { scrollLeft: number; scrollTop: number } = {
  left: 100,
  top: 50,
  right: 500,
  bottom: 350,
  width: 400,
  height: 300,
  scrollLeft: 10,
  scrollTop: 20,
};

describe("floating-position", () => {
  it("clamps scalar values", () => {
    expect(clamp(4, 10, 20)).toBe(10);
    expect(clamp(14, 10, 20)).toBe(14);
    expect(clamp(24, 10, 20)).toBe(20);
  });

  it("converts viewport coordinates to container coordinates", () => {
    expect(viewportPoint({ left: 140, top: 90 }, container)).toEqual({ left: 50, top: 60 });
  });

  it("clamps floating boxes inside the container viewport", () => {
    expect(
      clampFloatingPoint({ left: -100, top: 500 }, container, { width: 120, height: 40 }),
    ).toEqual({
      left: 18,
      top: 272,
    });
  });

  it("guards non-finite floating points", () => {
    expect(finitePoint({ left: Number.NaN, top: 10 })).toBeNull();
    expect(
      clampFloatingPoint({ left: Number.NaN, top: Number.POSITIVE_INFINITY }, container, {
        width: 120,
        height: 40,
      }),
    ).toEqual({ left: 18, top: 28 });
  });

  it("places centered float above when there is room", () => {
    expect(
      centeredFloatingPoint(rect({ left: 220, top: 180, right: 300, bottom: 210 }), container, {
        width: 120,
        height: 32,
      }),
    ).toEqual({ left: 110, top: 110, placement: "top" });
  });

  it("places centered float below near the top edge", () => {
    expect(
      centeredFloatingPoint(rect({ left: 220, top: 60, right: 300, bottom: 80 }), container, {
        width: 120,
        height: 32,
      }),
    ).toEqual({ left: 110, top: 58, placement: "bottom" });
  });

  it("places slash-like menus below or above based on space", () => {
    expect(
      belowFloatingPoint(rect({ left: 130, top: 70, right: 140, bottom: 90 }), container, {
        width: 200,
        height: 120,
      }),
    ).toEqual({ left: 40, top: 66, placement: "bottom" });

    expect(
      belowFloatingPoint(rect({ left: 130, top: 320, right: 140, bottom: 340 }), container, {
        width: 200,
        height: 120,
      }),
    ).toEqual({ left: 40, top: 164, placement: "top" });
  });

  it("places context panels near the focus point inside the anchor", () => {
    expect(
      nearbyFloatingPoint(
        rect({ left: 180, top: 160, right: 360, bottom: 240 }),
        { left: 330, top: 220 },
        container,
        { width: 120, height: 36 },
      ),
    ).toEqual({ left: 180, top: 86, placement: "top" });
  });

  it("flips context panels to the side near vertical edges", () => {
    expect(
      nearbyFloatingPoint(
        rect({ left: 180, top: 55, right: 360, bottom: 330 }),
        { left: 350, top: 72 },
        container,
        { width: 120, height: 220 },
      ),
    ).toEqual({ left: 278, top: 28, placement: "right" });
  });

  it("keeps block handles inside the container", () => {
    expect(
      sideHandlePoint(
        rect({ left: 104, top: 70, right: 480, bottom: 300 }),
        rect({ left: 104, top: 80, right: 480, bottom: 110 }),
        container,
        { width: 24, height: 24 },
      ),
    ).toEqual({ left: 12, top: 52 });
  });
});

function rect(input: Pick<RectLike, "left" | "top" | "right" | "bottom">): RectLike {
  return {
    ...input,
    width: input.right - input.left,
    height: input.bottom - input.top,
  };
}
