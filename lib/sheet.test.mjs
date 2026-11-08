import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SHEET_MAX, sheetCols, sheetVars } from "./sheet.ts";

// Habits a row on the desktop sheet, for a row of at most 4, 5, 6, 7 and 8.
const expected = {
  1: [1, 1, 1, 1, 1],
  2: [2, 2, 2, 2, 2],
  3: [3, 3, 3, 3, 3],
  4: [4, 4, 4, 4, 4],
  5: [3, 5, 5, 5, 5],
  6: [3, 3, 6, 6, 6],
  7: [4, 4, 4, 7, 7],
  8: [4, 4, 4, 4, 8],
};

test("1 to 8 habits: as few rows as the maximum allows, and none more than one habit short", () => {
  for (const [n, cols] of Object.entries(expected)) {
    SHEET_MAX.forEach((max, i) => {
      const c = sheetCols(+n, max);
      assert.equal(c, cols[i], `${n} habits, at most ${max} a row`);
      const rows = Math.ceil(n / c);
      assert.equal(rows, Math.ceil(n / max), `${n} habits, at most ${max}: fewest rows`);
      assert.ok(c * rows - n < rows, `${n} habits, at most ${max}: balanced`);
    });
  }
});

test("the dashboard sends one count for each maximum, read by globals.css as --c4 to --c8", () => {
  assert.deepEqual(sheetVars(3), { "--c4": 3, "--c5": 3, "--c6": 3, "--c7": 3, "--c8": 3 });
  assert.deepEqual(sheetVars(7), { "--c4": 4, "--c5": 4, "--c6": 4, "--c7": 7, "--c8": 7 });
});

test("globals.css switches to each longer row where every column keeps 17rem, and to no other", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const max of SHEET_MAX.slice(1)) {
    assert.match(css, new RegExp(`@media \\(width >= ${22 + 17 * max}rem\\) \\{\\s*\\.page \\{\\s*--cols: var\\(--c${max}\\);`));
  }
  assert.equal(css.match(/--cols: var\(--c\d+\);/g).length, SHEET_MAX.length);
});
