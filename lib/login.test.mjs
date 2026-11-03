import assert from "node:assert/strict";
import { test } from "node:test";
import { loginPath, safeNext } from "./login.ts";

test("sign-in returns to a path on this site and nowhere else", () => {
  assert.equal(safeNext("/stickers/5"), "/stickers/5");
  assert.equal(safeNext("/h/3?day=2026-10-01"), "/h/3?day=2026-10-01");
  assert.equal(safeNext("/h/3#year"), "/h/3");
  for (const bad of [
    undefined,
    null,
    ["/h/3"],
    "",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/.//evil.example",
    "/./\\evil.example",
    "https://evil.example/h/3",
    "javascript:alert(1)",
    "data:text/html,hi",
  ]) {
    const to = safeNext(bad);
    assert.ok(to === "/" || (to.startsWith("/") && !to.startsWith("//")), `${JSON.stringify(bad)} → ${to}`);
    assert.ok(!to.includes("evil"), `${JSON.stringify(bad)} → ${to}`);
  }
  assert.equal(loginPath("/"), "/login");
  assert.equal(loginPath("/h/3?day=2026-10-01"), "/login?next=%2Fh%2F3%3Fday%3D2026-10-01");
  assert.equal(safeNext(decodeURIComponent(loginPath("/stickers/5").split("next=")[1])), "/stickers/5");
});
