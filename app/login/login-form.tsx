"use client";

import { type CSSProperties, useActionState, useEffect, useRef, useState } from "react";
import { loginPath } from "@/lib/login";
import { PALETTE } from "@/lib/palette";
import { ease, gsap, reducedMotion, useMotion } from "@/lib/motion";
import { Coil } from "../coil";

export type LoginState = { email?: string; error?: string };

// The code length on this project (Supabase's email OTP length); the strip has a slot per digit,
// each in one of the eight habit colours.
const DIGITS = 8;

// A refused code: every wound turn drains back to its jog and the chips go dark, before the
// field clears and the slots open back into dashes.
function unwind(strip: Element) {
  if (reducedMotion()) return Promise.resolve();
  const pulses = strip.querySelectorAll(".coil__pulse");
  gsap.killTweensOf(pulses);
  gsap.set(pulses, { clearProps: "strokeDasharray,strokeDashoffset" });
  return new Promise<void>((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .fromTo(strip.querySelectorAll(".coil__turn[data-lit]"), { strokeDasharray: "1 1", strokeDashoffset: 0 }, { strokeDashoffset: 1, duration: 0.7, ease: ease.out, autoRound: false }, 0)
      .to(strip.querySelectorAll(".coil__chip"), { fillOpacity: 0, duration: 0.35, ease: ease.soft }, 0);
  });
}

// Current through the strip, sticker by sticker, the way the dashboard's coils light up on load.
const current = (strip: Element) => [
  strip.querySelectorAll(".coil__pulse"),
  { strokeDasharray: "0.25 1.3", strokeDashoffset: 0.25 },
  { strokeDashoffset: -1, duration: 0.9, stagger: 0.06, ease: ease.inOut, autoRound: false },
] as const;

export function LoginForm({
  action,
  next,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  next: string;
}) {
  const [code, setCode] = useState("");
  const strip = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: LoginState, data: FormData) => {
    const result = await action(prev, data);
    if (result.error) {
      if (strip.current) await unwind(strip.current);
      setCode("");
    }
    return result;
  }, {});

  // The eighth digit closes the circuit and sends the code, so a code filled from Mail signs
  // straight in. Sign in stays for a corrected digit and for screen readers.
  useEffect(() => {
    if (code.length === DIGITS) form.current?.requestSubmit();
  }, [code]);

  // Each new digit: its chip lights and its turns wind out from it, one sticker after another
  // when a whole code arrives at once. A deleted digit goes at once.
  const shown = useRef(code.length);
  useMotion(
    strip,
    () => {
      const was = shown.current;
      shown.current = code.length;
      if (code.length <= was) return;
      const slots = strip.current!.querySelectorAll(".strip__slot");
      const tl = gsap.timeline();
      for (let i = was; i < code.length; i++) {
        const at = (i - was) * 0.06;
        const chip = slots[i].querySelector(".coil__chip");
        gsap.set(chip, { clearProps: "fillOpacity" });
        tl.from(chip, { fillOpacity: 0, duration: 0.35, ease: ease.soft }, at);
        tl.fromTo(
          slots[i].querySelectorAll(".coil__turn"),
          { strokeDasharray: "1 1", strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.5, stagger: 0.04, ease: ease.out, autoRound: false },
          at + 0.1,
        );
      }
      if (code.length === DIGITS) tl.fromTo(...current(strip.current!), ">-0.2");
    },
    [code],
  );

  // While the code is checked, current keeps running round the strip: the wait is real.
  useMotion(
    strip,
    () => {
      if (!pending || code.length < DIGITS) return;
      gsap.timeline({ repeat: -1, delay: 1.2, repeatDelay: 0.2 }).fromTo(...current(strip.current!));
    },
    [pending],
  );

  const asking = Boolean(state.email);
  return (
    <>
      <h1 className="title">Sign in</h1>
      <form ref={form} action={formAction} className="login__form">
        <input type="hidden" name="next" value={next} />
        {asking && (
          <>
            <input type="hidden" name="email" value={state.email} />
            <p className="login__note">If {state.email} has an account, a code is on its way.</p>
          </>
        )}

        <div ref={strip} className="strip">
          <div className="strip__slots" aria-hidden="true">
            {Array.from({ length: DIGITS }, (_, i) => {
              const digit = code[i];
              const n = digit === undefined ? 0 : Number(digit);
              return (
                <div
                  key={i}
                  className="strip__slot"
                  style={{ "--habit": PALETTE[i].hex } as CSSProperties}
                  data-filled={digit !== undefined || undefined}
                  data-next={i === Math.min(code.length, DIGITS - 1) || undefined}
                >
                  <span className="coil coil--still">
                    <Coil kind="goal" target={n} count={n} />
                  </span>
                  <span className="strip__digit">{digit}</span>
                </div>
              );
            })}
          </div>
          {asking && (
            <input
              name="token"
              required
              inputMode="numeric"
              // Lets iOS offer the code straight from Mail.
              autoComplete="one-time-code"
              aria-label="Code"
              autoFocus
              readOnly={pending}
              className="strip__input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, DIGITS))}
            />
          )}
        </div>

        {!asking && <p className="login__note">Your code, one sticker per digit.</p>}

        <div className="login__controls">
          {asking ? (
            <>
              <button disabled={pending} className="button button--wide">
                {pending ? "Checking…" : "Sign in"}
              </button>
              <p aria-live="polite" className="login__error">
                {state.error}
              </p>
              <a href={loginPath(next)} className="undo login__other">
                Use another email
              </a>
            </>
          ) : (
            <>
              <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email" className="login__input" />
              <button disabled={pending} className="button button--wide">
                {pending ? "Sending…" : "Email me a code"}
              </button>
            </>
          )}
        </div>
      </form>
    </>
  );
}
