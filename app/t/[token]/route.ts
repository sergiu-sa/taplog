import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { tallyLine } from "@/lib/habits";
import { loadLog } from "@/lib/logged";
import { signId } from "@/lib/sig";
import { supabaseAdmin } from "@/lib/supabase/admin";

// What new_sticker() hands out: 16 random bytes as base64url.
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

// Scanners probing random paths never reach the database.
async function tap(token: string) {
  if (!TOKEN.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await supabaseAdmin.rpc("tap", { hash }).maybeSingle().throwOnError();
  return data;
}

export async function GET(request: NextRequest, ctx: RouteContext<"/t/[token]">) {
  // A link no sticker holds lands on /t, whose page says so with a 404.
  const unknown = () => Response.redirect(new URL("/t", request.url), 303);
  const data = await tap((await ctx.params).token);
  if (!data) return unknown();
  // No habit, or an archived one: nothing was logged, and the sticker's page asks which habit.
  if (data.log_id === null) return Response.redirect(new URL(`/stickers/${data.sticker_id}`, request.url), 303);

  const params = new URLSearchParams({ id: String(data.log_id), sig: signId(data.log_id) });
  if (data.dup) params.set("dup", "1");
  return Response.redirect(new URL(`/logged?${params}`, request.url), 303);
}

const say = (line: string, status = 200) =>
  new Response(line, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

// A Shortcuts automation on a sticker that holds no link: the same tap, answered as one line for
// its notification. A link preview or a prefetch never sends a POST.
export async function POST(_request: NextRequest, ctx: RouteContext<"/t/[token]">) {
  const { token } = await ctx.params;
  let data;
  try {
    data = await tap(token);
  } catch {
    return say("Didn't save. Try again.", 500);
  }
  if (!data) return say("This sticker's link has stopped.", 404);
  if (data.log_id === null) return say("Nothing logged. This sticker has no habit, or its habit is archived.");

  // The tap counts from here on, so a failed read still answers 200.
  try {
    const now = Date.now();
    const log = await loadLog(data.log_id, now);
    if (!log) return say("That tap was removed.");
    return say(tallyLine({ ...log, dup: data.dup ?? false }));
  } catch {
    return say(data.dup ? "Already counted." : "Logged.");
  }
}

// Next answers HEAD by running GET, so link checkers would log a tap. 204, not 405,
// because checkers retry a 405 with GET.
export function HEAD() {
  return new Response(null, { status: 204 });
}
