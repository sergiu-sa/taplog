import type { Metadata } from "next";
import { redirect, RedirectType } from "next/navigation";
import { safeNext } from "@/lib/login";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { Footer } from "../frame";
import { LoginForm, type LoginState } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

// The Supabase email template must carry only {{ .Token }}: a link shares the same
// one-time token, so a mail preview or scanner opening it would void the code.
async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  "use server";
  const email = formData.get("email");
  const token = formData.get("token");
  if (typeof email !== "string") return {};

  const supabase = await createClient();

  if (typeof token !== "string") {
    // Sign-ups are also disabled project-wide; this keeps an unknown address from creating a user.
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    // Same answer either way, so the form doesn't reveal which address has an account.
    if (error) console.error("signInWithOtp:", error.message);
    return { email };
  }

  const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: "email" });
  if (error) {
    console.error("verifyOtp:", error.message);
    return { email, error: "That code didn't work. Codes expire after an hour and work once." };
  }
  // Checked again here: this action is a POST anyone can send, whatever the page put in the form.
  // Replace, so Back from the page you return to doesn't reopen the code form.
  redirect(safeNext(formData.get("next")), RedirectType.replace);
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  return (
    <div className="page">
      <header className="masthead">
        <span>taplog</span>
      </header>
      <main id="main" tabIndex={-1} className="login">
        <LoginForm action={login} next={next} />
      </main>
      <Footer theme={await readTheme()} />
    </div>
  );
}
