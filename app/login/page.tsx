import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function sendLink(formData: FormData) {
  "use server";
  const email = formData.get("email");
  if (typeof email !== "string") redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Sign-ups are also disabled project-wide; this keeps an unknown address from creating a user.
      shouldCreateUser: false,
      // Next rejects Server Action POSTs whose Origin doesn't match the host, so this is
      // the real origin. Supabase also checks it against the Redirect URLs allow list.
      emailRedirectTo: `${(await headers()).get("origin")}/auth/confirm`,
    },
  });
  // Same screen either way, so the form doesn't reveal which address has an account.
  if (error) console.error("signInWithOtp:", error.message);

  redirect("/login?sent=1");
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { sent, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-16">
      <h1 className="text-2xl font-semibold">taplog</h1>

      {sent ? (
        <p className="mt-6 text-neutral-500">
          If that address is yours, a sign-in link is on its way. Open it in this browser.
          Nothing after a few minutes? Only a couple of emails go out per hour.
        </p>
      ) : (
        <form action={sendLink} className="mt-8 flex flex-col gap-3">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              That link didn&apos;t work. It expires after an hour, works once, and only in
              the browser you requested it from.
            </p>
          )}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email"
            className="h-14 rounded-2xl bg-neutral-100 px-4 text-lg dark:bg-neutral-900"
          />
          <button className="h-14 rounded-2xl bg-neutral-900 text-lg font-medium text-white active:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:active:bg-neutral-300">
            Email me a link
          </button>
        </form>
      )}
    </main>
  );
}
