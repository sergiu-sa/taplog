"use client";

import { useActionState } from "react";

export type LoginState = { email?: string; error?: string };

const field = "h-14 rounded-2xl bg-neutral-100 px-4 text-lg dark:bg-neutral-900";
const button =
  "h-14 rounded-2xl bg-neutral-900 text-lg font-medium text-white active:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:active:bg-neutral-300";

export function LoginForm({
  action,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  if (!state.email) {
    return (
      <form action={formAction} className="mt-8 flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email"
          className={field}
        />
        <button disabled={pending} className={button}>
          {pending ? "Sending…" : "Email me a code"}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-3">
      <p className="text-neutral-500">
        If {state.email} has an account, a code is on its way.
      </p>
      <input type="hidden" name="email" value={state.email} />
      <input
        name="token"
        required
        inputMode="numeric"
        // Lets Safari offer the code straight from Mail.
        autoComplete="one-time-code"
        placeholder="Code"
        aria-label="Code"
        className={`${field} tracking-widest tabular-nums`}
      />
      <button disabled={pending} className={button}>
        {pending ? "Checking…" : "Sign in"}
      </button>
      <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
      <a href="/login" className="text-center text-sm text-neutral-500 underline">
        Use another email
      </a>
    </form>
  );
}
