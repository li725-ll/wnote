export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ScrollLike {
  scrollLeft: number;
  scrollTop: number;
}

export interface FloatingPoint {
  left: number;
  top: number;
}

export interface FloatingBox {
  width: number;
  height: number;
}

const defaultPadding = 8;

export type FloatingPlacementSide = "top" | "bottom" | "left" | "right";
export type VerticalFloatingPlacementSide = "top" | "bottom";

export interface FloatingPlacement extends FloatingPoint {
  placement: VerticalFloatingPlacementSide;
}

export interface NearbyFloatingPlacement extends FloatingPoint {
  placement: FloatingPlacementSide;
}

export function finiteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function finitePoint(point: FloatingPoint): FloatingPoint | null {
  const left = finiteNumber(point.left);
  const top = finiteNumber(point.top);
  return left === null || top === null ? null : { left, top };
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

export function viewportPoint(
  point: FloatingPoint,
  container: RectLike & ScrollLike,
): FloatingPoint {
  return {
    left: point.left - container.left + container.scrollLeft,
    top: point.top - container.top + container.scrollTop,
  };
}

export function clampFloatingPoint(
  point: FloatingPoint,
  container: RectLike & ScrollLike,
  box: FloatingBox,
  padding = defaultPadding,
): FloatingPoint {
  const finite = finitePoint(point);
  if (!finite) return { left: container.scrollLeft + padding, top: container.scrollTop + padding };
  return {
    left: clamp(
      finite.left,
      container.scrollLeft + padding,
      container.scrollLeft + container.width - box.width - padding,
    ),
    top: clamp(
      finite.top,
      container.scrollTop + padding,
      container.scrollTop + container.height - box.height - padding,
    ),
  };
}

export function centeredFloatingPoint(
  anchor: RectLike,
  container: RectLike & ScrollLike,
  box: FloatingBox,
  gap = 8,
): FloatingPlacement {
  const anchorCenter = (anchor.left + anchor.right) / 2;
  const topSpace = anchor.top - container.top;
  const bottomSpace = container.bottom - anchor.bottom;
  const placeTop = topSpace >= box.height + gap || topSpace >= bottomSpace;
  const viewport = viewportPoint(
    {
      left: anchorCenter - box.width / 2,
      top: placeTop ? anchor.top - box.height - gap : anchor.bottom + gap,
    },
    container,
  );
  return {
    ...clampFloatingPoint(viewport, container, box),
    placement: placeTop ? "top" : "bottom",
  };
}

export function nearbyFloatingPoint(
  anchor: RectLike,
  focus: FloatingPoint | null,
  container: RectLike & ScrollLike,
  box: FloatingBox,
  gap = 8,
): NearbyFloatingPlacement {
  const target = focus && pointInRect(focus, anchor) ? focus : rectCenter(anchor);
  const options: Array<NearbyFloatingPlacement & { overflow: number; distance: number }> = [
    placementCandidate("top", target, anchor, container, box, gap),
    placementCandidate("bottom", target, anchor, container, box, gap),
    placementCandidate("right", target, anchor, container, box, gap),
    placementCandidate("left", target, anchor, container, box, gap),
  ];
  options.sort((left, right) => left.overflow - right.overflow || left.distance - right.distance);
  const best = options[0]!;
  return { left: best.left, top: best.top, placement: best.placement };
}

export function belowFloatingPoint(
  anchor: RectLike,
  container: RectLike & ScrollLike,
  box: FloatingBox,
  gap = 6,
): FloatingPlacement {
  const bottomSpace = container.bottom - anchor.bottom;
  const placeBottom = bottomSpace >= box.height + gap || bottomSpace >= anchor.top - container.top;
  const viewport = viewportPoint(
    {
      left: anchor.left,
      top: placeBottom ? anchor.bottom + gap : anchor.top - box.height - gap,
    },
    container,
  );
  return {
    ...clampFloatingPoint(viewport, container, box),
    placement: placeBottom ? "bottom" : "top",
  };
}

export function sideHandlePoint(
  editorRect: RectLike,
  blockRect: RectLike,
  container: RectLike & ScrollLike,
  handle: FloatingBox,
  gap = 6,
): FloatingPoint {
  const viewport = viewportPoint(
    {
      left: editorRect.left - handle.width - gap,
      top: blockRect.top + 2,
    },
    container,
  );
  return clampFloatingPoint(viewport, container, handle, 2);
}

function pointInRect(point: FloatingPoint, rect: RectLike): boolean {
  return (
    point.left >= rect.left &&
    point.left <= rect.right &&
    point.top >= rect.top &&
    point.top <= rect.bottom
  );
}

function rectCenter(rect: RectLike): FloatingPoint {
  return { left: (rect.left + rect.right) / 2, top: (rect.top + rect.bottom) / 2 };
}

function placementCandidate(
  placement: FloatingPlacementSide,
  target: FloatingPoint,
  anchor: RectLike,
  container: RectLike & ScrollLike,
  box: FloatingBox,
  gap: number,
): NearbyFloatingPlacement & { overflow: number; distance: number } {
  const viewport = viewportPoint(
    candidateViewportPoint(placement, target, anchor, box, gap),
    container,
  );
  const clamped = clampFloatingPoint(viewport, container, box);
  return {
    ...clamped,
    placement,
    overflow: overflowAmount(viewport, container, box),
    distance: Math.abs(clamped.left - viewport.left) + Math.abs(clamped.top - viewport.top),
  };
}

function candidateViewportPoint(
  placement: FloatingPlacementSide,
  target: FloatingPoint,
  anchor: RectLike,
  box: FloatingBox,
  gap: number,
): FloatingPoint {
  switch (placement) {
    case "bottom":
      return { left: target.left - box.width / 2, top: anchor.bottom + gap };
    case "left":
      return { left: anchor.left - box.width - gap, top: target.top - box.height / 2 };
    case "right":
      return { left: anchor.right + gap, top: target.top - box.height / 2 };
    case "top":
    default:
      return { left: target.left - box.width / 2, top: anchor.top - box.height - gap };
  }
}

function overflowAmount(
  point: FloatingPoint,
  container: RectLike & ScrollLike,
  box: FloatingBox,
): number {
  const minLeft = container.scrollLeft + defaultPadding;
  const minTop = container.scrollTop + defaultPadding;
  const maxLeft = container.scrollLeft + container.width - box.width - defaultPadding;
  const maxTop = container.scrollTop + container.height - box.height - defaultPadding;
  return (
    Math.max(0, minLeft - point.left) +
    Math.max(0, point.left - maxLeft) +
    Math.max(0, minTop - point.top) +
    Math.max(0, point.top - maxTop)
  );
}
