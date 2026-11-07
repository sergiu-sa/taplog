import assert from "node:assert/strict";
import { test } from "node:test";
import { GROUND, habitVars, PALETTE } from "./palette.ts";

// WCAG 2 contrast, as the 3:1 for graphics is defined.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (x, y) => (Math.max(lum(x), lum(y)) + 0.05) / (Math.min(lum(x), lum(y)) + 0.05);

test("every colour traces at 3:1 or more: its light shade on the light ground, raw on the dark", () => {
  for (const c of PALETTE) {
    assert.match(c.light ?? "", /^#[0-9a-f]{6}$/i, `${c.name} has no light shade`);
    assert.ok(contrast(c.light, GROUND.light) >= 3, `${c.name} light ${contrast(c.light, GROUND.light).toFixed(2)}`);
    assert.ok(contrast(c.hex, GROUND.dark) >= 3, `${c.name} dark ${contrast(c.hex, GROUND.dark).toFixed(2)}`);
  }
});

test("habitVars sets the light shade beside the stored colour", () => {
  assert.deepEqual(habitVars("#F97316"), { "--habit": "#F97316", "--habit-light": "#db6204" });
  for (const c of PALETTE) assert.equal(habitVars(c.hex)["--habit-light"], c.light);
});
