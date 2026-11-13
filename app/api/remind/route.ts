import { createHash, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { behindPace, nudgeText, osloDay, periodCounts, periodOf, weekStart, type Kind, type Period } from "@/lib/habits";
import { supabaseAdmin } from "@/lib/supabase/admin";

const digest = (s: string) => createHash("sha256").update(s).digest();

// Both sides are hashed first, so the comparison takes the same time whatever was sent,
// its length included. With no secret set, nobody gets in.
function fromCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}

// Called by the database's cron job every 15 minutes. No one is signed in here, so it reads
// with the secret key; nothing in the request reaches a query.
export async function POST(request: Request) {
  if (!fromCron(request)) return new Response(null, { status: 401 });

  // The app's own address: who is sending, as the push services ask (Apple refuses anything but
  // https or mailto), and where a tapped notification opens. Vercel sets it; set it by hand elsewhere.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) {
    console.error("VERCEL_PROJECT_PRODUCTION_URL is not set");
    return new Response(null, { status: 500 });
  }
  const site = `https://${host}`;

  const now = Date.now();
  const today = osloDay(now);
  const [habits, counts, subs] = await Promise.all([
    supabaseAdmin.from("habits").select("id, user_id, name, kind, period, daily_target, reminded_at").eq("kind", "goal").eq("remind", true).is("archived_at", null).throwOnError(),
    supabaseAdmin.from("daily_counts").select("habit_id, day, count").gte("day", weekStart(today)).throwOnError(),
    supabaseAdmin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").throwOnError(),
  ]);

  const vapidDetails = { subject: site, publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! };
  const gone = new Set<number>();
  let sent = 0;

  for (const h of habits.data) {
    const period = h.period as Period;
    // Counted as Today counts it. daily_target is the current period's target: a trigger
    // copies each change of it into the history, so the two can't drift.
    const taps = new Map(counts.data.filter((c) => c.habit_id === h.id).map((c) => [c.day!, c.count ?? 0]));
    const count = periodCounts(taps, period).get(periodOf(period, today)) ?? 0;
    const mine = subs.data.filter((s) => s.user_id === h.user_id && !gone.has(s.id));
    if (!mine.length || !behindPace({ kind: h.kind as Kind, period, target: h.daily_target, count, reminded: h.reminded_at }, now)) continue;

    // The declarative shape: iOS shows it by itself, and the service worker reads the same JSON.
    const payload = JSON.stringify({ web_push: 8030, notification: { ...nudgeText(h.name, count, h.daily_target, period), navigate: `${site}/`, tag: `habit-${h.id}` } });
    const delivered = await Promise.all(
      mine.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { vapidDetails, TTL: 3600, timeout: 10_000 }).then(
          () => true,
          (e: { statusCode?: number }) => {
            // 404 and 410 mean the app was removed or its permission withdrawn.
            if (e.statusCode === 404 || e.statusCode === 410) gone.add(s.id);
            else console.error("push refused", e.statusCode);
            return false;
          },
        ),
      ),
    );
    if (!delivered.some(Boolean)) continue;
    // A stamp that fails must not stop the habits after it or the pruning below.
    const { error } = await supabaseAdmin.from("habits").update({ reminded_at: new Date(now).toISOString() }).eq("id", h.id);
    if (error) console.error("nudge not stamped", error.code);
    sent++;
  }

  if (gone.size) await supabaseAdmin.from("push_subscriptions").delete().in("id", [...gone]).throwOnError();
  return Response.json({ sent, pruned: gone.size });
}
