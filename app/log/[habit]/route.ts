import type { NextRequest } from "next/server";
import { signId } from "@/lib/sig";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEDUPE_MS = 30_000;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/log/[habit]">,
) {
  const secret = process.env.LOG_SECRET;
  if (!secret || request.nextUrl.searchParams.get("k") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { habit } = await ctx.params;

  const { data: found } = await supabaseAdmin
    .from("habits")
    .select("slug")
    .eq("slug", habit)
    .maybeSingle()
    .throwOnError();
  if (!found) return new Response("Unknown habit", { status: 404 });

  // Check-then-insert: a second request that arrives before the first insert lands
  // (hundreds of ms on a cold start) also inserts. Fix with a locking SQL function if seen.
  const since = new Date(Date.now() - DEDUPE_MS).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("logs")
    .select("id")
    .eq("habit_slug", habit)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .throwOnError();

  let id = recent?.id;
  const dup = Boolean(id);
  if (!id) {
    const { data } = await supabaseAdmin
      .from("logs")
      .insert({ habit_slug: habit })
      .select("id")
      .single()
      .throwOnError();
    id = data.id;
  }

  const params = new URLSearchParams({ id: String(id), sig: signId(id) });
  if (dup) params.set("dup", "1");
  return Response.redirect(new URL(`/logged?${params}`, request.url), 303);
}

// Next answers HEAD by running GET, so link checkers would log a tap. 204, not 405,
// because checkers retry a 405 with GET.
export function HEAD() {
  return new Response(null, { status: 204 });
}
