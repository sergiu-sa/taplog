"use client";

import { useId, useState, useTransition } from "react";
import { thisDevice } from "./reminders";

export type SignOutLocal = (endpoint?: string) => Promise<void>;
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

  // This browser's reminders end with its session: the browser forgets its subscription and
  // the action deletes the server's row.
  async function leave() {
    return local(await forget());
  }

  // A browser that can't drop its subscription still signs out: the server's row goes anyway.
  async function forget() {
    const sub = await thisDevice();
    await sub?.unsubscribe().catch(() => {});
    return sub?.endpoint;
  }

  // The action deletes every device's row; this browser also drops its own, so it reads Off
  // when someone signs in here again.
  async function leaveAll() {
    await forget();
    return everywhere();
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
              className="button"
              autoFocus
              aria-describedby={id}
              aria-disabled={busy || undefined}
              onClick={() => run(leaveAll)}
            >
              Yes, sign out everywhere
            </button>
            <button type="button" className="button button--line" aria-disabled={busy || undefined} onClick={() => ask(false)}>
              Keep it
            </button>
          </p>
        </div>
      ) : (
        <p className="sign-out">
          <button type="button" className="button button--line" aria-disabled={busy || undefined} onClick={() => run(leave)}>
            Sign out
          </button>
          <button type="button" className="button button--line" aria-disabled={busy || undefined} onClick={() => ask(true)}>
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
