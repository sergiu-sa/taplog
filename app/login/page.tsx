import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm, type LoginState } from "./login-form";

// A typed code instead of a magic link: a link only worked in the browser that asked
// for it, and anything that opened it first (a mail preview, a scanner) used it up.
// The email template must carry only {{ .Token }}; a link would spend the same token.
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
  redirect("/");
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-16">
      <h1 className="text-2xl font-semibold">taplog</h1>
      <LoginForm action={login} />
    </main>
  );
}
