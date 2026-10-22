import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { signId } from "@/lib/sig";
import { supabaseAdmin } from "@/lib/supabase/admin";

// What new_sticker() hands out: 16 random bytes as base64url.
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

export async function GET(request: NextRequest, ctx: RouteContext<"/t/[token]">) {
  const { token } = await ctx.params;
  // Scanners probing random paths never reach the database.
  if (!TOKEN.test(token)) return new Response("Not found", { status: 404 });

  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await supabaseAdmin.rpc("tap", { hash }).maybeSingle().throwOnError();
  if (!data) return new Response("Unknown sticker", { status: 404 });

  const params = new URLSearchParams({ id: String(data.log_id), sig: signId(data.log_id) });
  if (data.dup) params.set("dup", "1");
  return Response.redirect(new URL(`/logged?${params}`, request.url), 303);
}

// Next answers HEAD by running GET, so link checkers would log a tap. 204, not 405,
// because checkers retry a 405 with GET.
export function HEAD() {
  return new Response(null, { status: 204 });
}
