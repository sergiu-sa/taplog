import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes an expired access token before the page renders, since Server Components
// can't write the new cookies. Refresh tokens are single-use: if the new pair is never
// saved, the next request reuses the old one and Supabase revokes the session.
// The auth check itself lives in the page.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          // The page reads the request's cookies and the browser stores the response's.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // no-store, so a CDN never caches a response carrying someone's session.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}

// Only the dashboard, the habit pages and the editor (and their Server Actions, which POST to
// them) read the session. Taps on /t and /logged never pay for this.
export const config = { matcher: ["/", "/h/:id", "/h/:id/edit", "/habits/new"] };
