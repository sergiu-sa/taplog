import assert from "node:assert/strict";
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
  assert.deepEqual(SHEET_MAX, [4, 5, 6, 7, 8]);
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
