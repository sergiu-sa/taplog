import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Throwing on import fails the build when it's unset, so a deploy can never log a
// tap it can't sign.
if (!process.env.SIG_SECRET) throw new Error("SIG_SECRET is not set");
const key = process.env.SIG_SECRET;

// Log ids are sequential, so /logged?id=N alone would let anyone read counts or
// undo recent taps by guessing N. The signature proves /t issued that id.
export function signId(id: string | number) {
  return createHmac("sha256", key)
    .update(String(id))
    .digest("base64url")
    .slice(0, 16);
}

export function verifyId(id: string, sig: string) {
  const expected = Buffer.from(signId(id));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
