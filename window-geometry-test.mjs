import test from "node:test";
import assert from "node:assert/strict";
import { resizeRect, snapRect } from "./js/window-geometry.js";
test("metades cobrem a área sem lacunas inclusive larguras ímpares", () => {
  for (const width of [640, 901, 1280]) {
    const area = { width, height: 700 },
      left = snapRect("left", area),
      right = snapRect("right", area);
    assert.equal(left.width + right.width, width);
    assert.equal(left.x, 0);
    assert.equal(right.x, left.width);
    assert.equal(right.height, 700);
  }
});
test("bordas e cantos respeitam mínimos e limites", () => {
  const start = { x: 100, y: 50, width: 500, height: 400 },
    area = { width: 1200, height: 800 };
  assert.deepEqual(resizeRect(start, "se", 100, 50, area), {
    x: 100,
    y: 50,
    width: 600,
    height: 450,
  });
  assert.deepEqual(resizeRect(start, "nw", -200, -200, area), {
    x: 0,
    y: 0,
    width: 600,
    height: 450,
  });
  assert.deepEqual(resizeRect(start, "nw", 999, 999, area), {
    x: 280,
    y: 210,
    width: 320,
    height: 240,
  });
  for (const d of ["n", "s", "e", "w", "ne", "nw", "se", "sw"])
    for (const offset of [-9999, 9999]) {
      const r = resizeRect(start, d, offset, offset, area);
      assert.ok(
        r.x >= 0 &&
          r.y >= 0 &&
          r.width >= 320 &&
          r.height >= 240 &&
          r.x + r.width <= area.width &&
          r.y + r.height <= area.height,
      );
    }
});
