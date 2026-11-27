export const minWindowWidth = 320;
export const minWindowHeight = 240;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
export function snapRect(side, area) {
  const split = Math.floor(area.width / 2);
  return {
    x: side === "right" ? split : 0,
    y: 0,
    width: side === "right" ? area.width - split : split,
    height: area.height,
  };
}
export function resizeRect(start, direction, dx, dy, area) {
  const minW = Math.min(minWindowWidth, area.width),
    minH = Math.min(minWindowHeight, area.height);
  let left = start.x,
    right = start.x + start.width,
    top = start.y,
    bottom = start.y + start.height;
  if (direction.includes("e"))
    right = clamp(right + dx, left + minW, area.width);
  if (direction.includes("s"))
    bottom = clamp(bottom + dy, top + minH, area.height);
  if (direction.includes("w")) left = clamp(left + dx, 0, right - minW);
  if (direction.includes("n")) top = clamp(top + dy, 0, bottom - minH);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
