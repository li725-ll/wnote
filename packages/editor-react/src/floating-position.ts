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

export interface FloatingPlacement extends FloatingPoint {
  placement: "top" | "bottom";
}

const defaultPadding = 8;

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
  return {
    left: clamp(
      point.left,
      container.scrollLeft + padding,
      container.scrollLeft + container.width - box.width - padding,
    ),
    top: clamp(
      point.top,
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
