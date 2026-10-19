import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Log ids are sequential, so /logged?id=N alone would let anyone read counts or
// undo recent taps by guessing N. The signature proves /log issued that id.
export function signId(id: string | number) {
  return createHmac("sha256", process.env.LOG_SECRET!)
    .update(String(id))
    .digest("base64url")
    .slice(0, 16);
}

export function verifyId(id: string, sig: string) {
  const expected = Buffer.from(signId(id));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
