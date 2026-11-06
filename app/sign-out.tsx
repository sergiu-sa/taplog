"use client";

import { useId, useState, useTransition } from "react";

export type SignOutLocal = () => Promise<void>;
export type SignOutEverywhere = () => Promise<string | null>;

const FAILED = "Didn't sign out. Try again.";

// POSTs from buttons, never links, so nothing a prefetch follows can sign anyone out. Both leave
// for /login when they work; a failure closes the ask and stays here as a sentence.
export function SignOut({ local, everywhere }: { local: SignOutLocal; everywhere: SignOutEverywhere }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const id = useId();

  // A sent action runs to the end whatever is pressed after it, Keep it included, so every
  // button waits for the answer.
  function run(action: () => Promise<string | null | void>) {
    if (busy) return;
    setError("");
    startTransition(async () => {
      try {
        const failed = await action();
        if (failed) {
          setError(failed);
          setAsking(false);
        }
      } catch {
        setError(FAILED);
        setAsking(false);
      }
    });
  }

  function ask(open: boolean) {
    if (busy) return;
    setError("");
    setAsking(open);
  }

  return (
    <>
      {asking ? (
        <div className="sign-out__ask">
          <p id={id}>Signs you out on every device, the home-screen app too. Other devices are signed out within an hour.</p>
          <p className="sign-out">
            <button
              type="button"
              className="undo sign-out__yes"
              autoFocus
              aria-describedby={id}
              aria-disabled={busy || undefined}
              onClick={() => run(everywhere)}
            >
              Yes, sign out everywhere
            </button>
            <button type="button" className="undo" aria-disabled={busy || undefined} onClick={() => ask(false)}>
              Keep it
            </button>
          </p>
        </div>
      ) : (
        <p className="sign-out">
          <button type="button" className="undo" aria-disabled={busy || undefined} onClick={() => run(local)}>
            Sign out
          </button>
          <button type="button" className="undo" aria-disabled={busy || undefined} onClick={() => ask(true)}>
            Sign out everywhere
          </button>
        </p>
      )}
      {error && (
        <p className="day__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
