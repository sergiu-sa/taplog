"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { formatDay, formatGap, MAX_TARGET, minTarget, SPACINGS, type Kind, type Period } from "@/lib/habits";
import { ease, gsap, useMotion } from "@/lib/motion";
import { habitVars, PALETTE } from "@/lib/palette";
import type { Saved } from "./actions";
import { Coil } from "./coil";
import type { EditorView } from "./detail-view";

const STEPS = [null, ...SPACINGS];

// Make or edit a habit. The coil is a specimen, fully wound, so the stepper's turns and the
// colour both show; it says nothing about today's count.
export function HabitEditor({
  habit,
  today,
  color: firstColor,
  backHref,
  save,
  archive,
  remove,
}: {
  habit: EditorView | null; // null makes a new one
  today: string;
  color: string; // what a new habit starts with
  backHref: string;
  save: (prev: Saved, form: FormData) => Promise<Saved>;
  archive?: () => Promise<string | void>; // or restore, for an archived habit
  remove?: () => Promise<string | void>;
}) {
  // Controlled: React resets a form's uncontrolled fields after every action, failed ones too.
  const [title, setTitle] = useState(habit?.name ?? "");
  const [kind, setKind] = useState<Kind>(habit?.kind ?? "goal");
  const [period, setPeriod] = useState<Period>(habit?.period ?? "day");
  const [target, setTarget] = useState(habit?.target ?? 1);
  const [color, setColor] = useState(habit?.color ?? firstColor);
  // Kept while the field is hidden (a goal, a limit of 0), so the pick comes back; neither saves one.
  const [spacing, setSpacing] = useState(habit?.spacing ?? null);
  const step = STEPS.indexOf(spacing);
  const [state, formAction, saving] = useActionState(save, null);
  // Set in the same tick as the submit, before saving shows: a double click must not make two habits.
  const sent = useRef(false);
  useEffect(() => {
    if (!saving) sent.current = false;
  }, [saving]);
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();
  const [moreError, setMoreError] = useState("");
  const specimen = useRef<HTMLDivElement>(null);
  // The database refuses the change too; this only stops offering it.
  const locked = (habit?.taps ?? 0) > 0;
  const min = minTarget(kind);

  // Archive and Delete leave the page when they work; a failure stays here as a sentence.
  function run(action: () => Promise<string | void>) {
    if (busy) return;
    setMoreError("");
    startTransition(async () => {
      try {
        const failed = await action();
        if (failed) setMoreError(failed);
      } catch {
        setMoreError("Didn't save. Try again.");
      }
    });
  }

  function pickKind(k: Kind) {
    setKind(k);
    setTarget((t) => Math.max(t, minTarget(k)));
  }

  // One more turn draws from its jog round to the edge; one fewer redraws at once.
  const drawn = useRef(target);
  useMotion(
    specimen,
    () => {
      const grew = target > drawn.current;
      drawn.current = target;
      const turn = specimen.current!.querySelectorAll(".coil__turn")[target - 1];
      if (grew && turn) {
        gsap.fromTo(turn, { strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: ease.out, autoRound: false });
      }
    },
    [target],
  );

  const name = habit?.name;
  return (
    <div className="page">
      <header className="masthead">
        <Link href={backHref} prefetch={false} className="trace">
          ← {name ?? "Today"}
        </Link>
        <time dateTime={today}>
          <span className="desk:hidden">{formatDay(today)}</span>
          <span className="hidden desk:inline">{formatDay(today, "long")}</span>
        </time>
      </header>

      <main id="main" tabIndex={-1}>
        <h1 className="title">{name ? `Edit ${name}` : "New habit"}</h1>
        <form
          action={(form) => {
            if (sent.current) return;
            sent.current = true;
            formAction(form);
          }}
          className="editor"
          style={habitVars(color)}
        >
          <div className="editor__fields">
            <label className="field">
              <span>Name</span>
              <input type="text" name="name" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={40} autoComplete="off" />
            </label>
            {locked ? (
              <div className="field">
                <span>Kind</span>
                <p className="kind-locked">
                  {kind === "goal" ? "Goal" : "Limit"}
                  <small>Locked after the first tap</small>
                </p>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="period" value={period} />
              </div>
            ) : (
              <fieldset className="field">
                <legend>Kind</legend>
                <div className="kinds">
                  {(["goal", "limit"] as const).map((k) => (
                    <label key={k}>
                      <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => pickKind(k)} />
                      {k === "goal" ? "Goal" : "Limit"}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {/* A pace, not a score: it never locks, so it stays a stepper after the first tap. A
                limit of 0 never shows "Next from", so it offers none. */}
            {kind === "limit" && target > 0 && (
              <div className="field">
                <span id="spacing-label">Spacing</span>
                <div className="stepper stepper--spacing" role="group" aria-labelledby="spacing-label">
                  <button type="button" aria-label="Less time" aria-disabled={step === 0 || undefined} onClick={() => setSpacing(STEPS[Math.max(0, step - 1)])}>
                    −
                  </button>
                  <output aria-live="polite">
                    {spacing ? formatGap(spacing * 60_000) : "Off"}
                    {spacing && <span className="sr-only"> between taps</span>}
                  </output>
                  <button
                    type="button"
                    aria-label="More time"
                    aria-disabled={step === STEPS.length - 1 || undefined}
                    onClick={() => setSpacing(STEPS[Math.min(STEPS.length - 1, step + 1)])}
                  >
                    +
                  </button>
                  <input type="hidden" name="spacing" value={spacing ?? ""} />
                </div>
                <p className="stepper__per" data-hidden={!spacing || undefined}>
                  between taps
                </p>
              </div>
            )}
          </div>

          <div className="editor__coil">
            <div ref={specimen} className="coil coil--still" aria-hidden="true">
              <Coil kind={kind} target={target} count={target} />
            </div>
            <div className="stepper" role="group" aria-label="Target">
              {/* aria-disabled, not disabled: a button that disables itself drops the focus. */}
              <button type="button" aria-label="One fewer" aria-disabled={target <= min || undefined} onClick={() => setTarget((t) => Math.max(min, t - 1))}>
                −
              </button>
              <output aria-live="polite">
                <span className="stepper__per" data-hidden={kind === "goal" || undefined}>
                  at most
                </span>
                <span className="stepper__n">{target}</span>
                {/* The period words sit under the stepper; a step still announces the whole phrase. */}
                <span className="sr-only"> a {period}</span>
              </output>
              <button type="button" aria-label="One more" aria-disabled={target >= MAX_TARGET || undefined} onClick={() => setTarget((t) => Math.min(MAX_TARGET, t + 1))}>
                +
              </button>
              <input type="hidden" name="target" value={target} />
            </div>
            {/* The period finishes the stepper's phrase: "at most 15 a day". It locks with the kind. */}
            {locked ? (
              <p className="stepper__per">a {period}</p>
            ) : (
              <div className="words editor__period" role="radiogroup" aria-label="Period">
                {(["day", "week"] as const).map((p) => (
                  <label key={p}>
                    <input type="radio" name="period" value={p} checked={period === p} onChange={() => setPeriod(p)} />
                    <span className="trace">a {p}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <fieldset className="field editor__colours">
            <legend>Colour</legend>
            <div className="swatches">
              {PALETTE.map((c) => (
                <label key={c.hex} className="swatch" style={habitVars(c.hex)}>
                  <input type="radio" name="color" value={c.hex} checked={color === c.hex} onChange={() => setColor(c.hex)} aria-label={c.name} />
                  <span />
                </label>
              ))}
            </div>
          </fieldset>

          {habit && target !== habit.target && (
            <p className="editor__note">
              {period === "week" ? "From this week. Earlier weeks" : "From today. Earlier days"} keep {habit.kept}.
            </p>
          )}
          {state?.error && (
            <p className="editor__error" role="alert">
              {state.error}
            </p>
          )}
          <button type="submit" className="button button--wide editor__save" disabled={saving}>
            {habit ? "Save" : "Add habit"}
          </button>
        </form>

        {habit && (
          <div className="editor__more">
            <button type="button" className="button button--line" aria-disabled={busy || undefined} onClick={() => run(archive!)}>
              {habit.archived ? `Restore ${habit.name}` : `Archive ${habit.name}`}
            </button>
            {confirming ? (
              <div className="editor__confirm">
                <p>
                  Deletes {habit.name}
                  {habit.taps > 0 && ` and its ${habit.taps} ${habit.taps === 1 ? "tap" : "taps"}`} for good.
                  {habit.stickers > 0 &&
                    ` ${habit.stickers === 1 ? "Its sticker stays and asks" : `Its ${habit.stickers} stickers stay and ask`} for a habit on the next tap.`}
                </p>
                <button type="button" className="button" autoFocus aria-disabled={busy || undefined} onClick={() => run(remove!)}>
                  Delete {habit.name}
                </button>
                <button type="button" className="button button--line" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </div>
            ) : (
              <button type="button" className="button button--line button--short" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
            {moreError && (
              <p className="editor__error" role="alert">
                {moreError}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
