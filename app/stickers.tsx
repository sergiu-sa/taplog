"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { targetText } from "@/lib/habits";
import { ease, gsap, useMotion } from "@/lib/motion";
import { habitVars, PALETTE } from "@/lib/palette";
import { Coil } from "./coil";
import type { Made } from "./actions";
import type { StickerRow, StickerView } from "./detail-view";
import { Footer, NewHabit, type Frame } from "./frame";
import { Refresh } from "./refresh";

type Run = () => Promise<string | void>;

const FAILED = "Didn't save. Try again.";

// A sticker drawn as a small three-turn coil: lit in its habit's colour while it logs, etch
// while it logs nothing.
function Mark({ live }: { live: boolean }) {
  return (
    <span className="mark">
      <Coil kind="goal" target={3} count={live ? 3 : 0} />
    </span>
  );
}

// Non-breaking inside each part, so a narrow column breaks only after the comma.
const tapsLine = (taps: number, last: string | null) =>
  !last ? "Not tapped yet" : taps === 0 ? `Last tapped\u00a0${last}` : `${taps}\u00a0${taps === 1 ? "tap" : "taps"}, last\u00a0${last}`;

// The habit page's stickers, and "Add a sticker", which shows the new link once.
export function Stickers({
  name,
  archived,
  stickers,
  href,
  add,
}: {
  name: string;
  archived: boolean;
  stickers: StickerRow[];
  href: string;
  add: (label: string) => Promise<Made>;
}) {
  const [made, setMade] = useState<{ label: string; link: string } | null>(null);
  // Next keeps a visited page alive but hidden; dropping the token there means Back never shows it again.
  useLayoutEffect(() => () => setMade(null), []);
  if (archived && stickers.length === 0) return null;

  return (
    <section className="stickers" aria-labelledby="stickers-title">
      <h2 id="stickers-title" className="section__title">
        Stickers
      </h2>
      {archived && <p className="stickers__note">They log nothing while {name} is archived.</p>}
      {stickers.length > 0 ? (
        <ul className="stickers__list">
          {stickers.map((s) => (
            <li key={s.id}>
              <Link href={`${href}${s.id}`} prefetch={false} className="sticker">
                <Mark live={!archived} />
                <span className="sticker__label">
                  <span className="trace">{s.label}</span>
                </span>
                <span className="sticker__last">{s.lastTap ?? "Not tapped yet"}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="stickers__note">None yet. Each sticker gets a link of its own.</p>
      )}
      {made ? (
        <LinkPanel label={made.label} link={made.link} onDone={() => setMade(null)} />
      ) : (
        !archived && (
          <LineForm
            label="Add a sticker"
            button="Add"
            placeholder="Where it sits"
            send={async (label) => {
              const r = await add(label);
              if ("error" in r) return r.error;
              setMade({ label, link: r.link });
            }}
          />
        )
      )}
    </section>
  );
}

// One text field and its button. A sentence comes back only if it failed.
function LineForm({
  label,
  button,
  placeholder,
  initial = "",
  send,
}: {
  label: string;
  button: string;
  placeholder?: string;
  initial?: string;
  send: (value: string) => Promise<string | void>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // Set in the same tick as the submit: a double tap must not make two stickers.
  const sent = useRef(false);

  return (
    <form
      className="line-form"
      action={() => {
        if (sent.current) return;
        const v = value.trim();
        if (!v || v.length > 40) return setError("A name needs 1 to 40 characters.");
        sent.current = true;
        setError("");
        startTransition(async () => {
          try {
            const failed = await send(v);
            if (failed) setError(failed);
            else if (!initial) setValue("");
          } catch {
            setError(FAILED);
          }
          sent.current = false;
        });
      }}
    >
      <label htmlFor={`line-${button}`}>{label}</label>
      <input
        id={`line-${button}`}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        maxLength={40}
        autoComplete="off"
        placeholder={placeholder}
      />
      <button type="submit" className="button" aria-disabled={pending || undefined}>
        {button}
      </button>
      {error && (
        <p className="day__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

// The link exists only here, in this component's state: the database keeps its token's hash.
// It's a field, never an <a>, because opening it logs a tap.
function LinkPanel({ label, link, replaced, onDone }: { label: string; link: string; replaced?: boolean; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // The new sticker's turns draw in from the chip: an antenna getting its current.
  useMotion(
    root,
    () =>
      void gsap.fromTo(
        ".mark .coil__turn",
        { strokeDasharray: "1 1", strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.7, ease: ease.out, stagger: 0.06, autoRound: false },
      ),
    [],
  );
  useEffect(() => {
    if (!copied) return;
    const timer = gsap.delayedCall(2, () => setCopied(false));
    return () => void timer.kill();
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      field.current?.select();
    }
  }

  return (
    <div ref={root} className="panel" role="group" aria-labelledby="panel-title">
      <Mark live />
      <h3 id="panel-title" className="panel__title">
        Link for {label}
      </h3>
      <input ref={field} className="panel__link" readOnly value={link} onFocus={(e) => e.target.select()} aria-label={`Link for ${label}`} />
      {/* Opened by Add or New link, so focus follows to the one thing to do next. */}
      <button type="button" className="button button--wide" autoFocus onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
      <ol className="panel__steps">
        <li>In NFC Tools: Write, Add a record, URL. Paste it.</li>
        <li>Tap Write and hold the phone to the sticker.</li>
        <li>Tap the sticker once to check that it logs.</li>
      </ol>
      {replaced && <p className="panel__note">The old link has stopped. A Shortcuts automation on this sticker needs the new one too.</p>}
      <p className="panel__note">Shown once. Paste it nowhere else: a chat’s link preview logs a tap.</p>
      <button type="button" className="button button--line panel__done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

// /stickers/[id]: what the sticker logs to, and everything that can change about it. With no
// habit, or an archived one, the question of which habit comes first.
export function StickerPage({
  view,
  backHref,
  newHref,
  move,
  rename,
  newLink,
  remove,
  restore,
  frame,
}: {
  view: StickerView;
  backHref: string;
  newHref: string;
  move: (habitId: number) => Promise<string | void>;
  rename: (label: string) => Promise<string | void>;
  newLink: () => Promise<Made>;
  remove: Run;
  restore?: Run; // only for a sticker on an archived habit
  frame: Frame;
}) {
  const { habit, label } = view;
  const live = habit !== null && !habit.archived;
  const others = view.habits.filter((h) => h.id !== habit?.id);
  const [link, setLink] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"link" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  useLayoutEffect(() => () => setLink(null), []);

  function run(action: () => Promise<string | void | Made>) {
    if (busy) return;
    setError("");
    startTransition(async () => {
      try {
        const r = await action();
        if (typeof r === "string") setError(r);
        else if (r && "error" in r) setError(r.error);
        else if (r && "link" in r) {
          setLink(r.link);
          setConfirm(null);
        }
      } catch {
        setError(FAILED);
      }
    });
  }

  return (
    <div className="page" style={habitVars(habit?.color ?? PALETTE[5].hex)}>
      <Refresh />
      <header className="masthead">
        <Link href={backHref} prefetch={false} className="trace">
          ← {habit?.name ?? "Today"}
        </Link>
        <NewHabit href={newHref} />
      </header>

      <main id="main" tabIndex={-1}>
        <h1 className="title">{label}</h1>
        <div className="sticker-page">
          <div className="sticker-page__state">
            <p className="sticker-page__logs">{live ? `Logs to ${habit.name}` : habit ? `${habit.name} is archived` : "Logs nothing yet"}</p>
            <p className="sticker-page__meta">{tapsLine(view.taps, view.lastTap)}</p>
            {!live && (
              <p className="sticker-page__ask">
                {habit ? "So its taps count nowhere. Restore it, or move the sticker." : "Pick a habit, then tap the sticker again to log."}
              </p>
            )}
            {habit?.archived && restore && (
              <button type="button" className="button" aria-disabled={busy || undefined} onClick={() => run(restore)}>
                Restore {habit.name}
              </button>
            )}
          </div>
          <div className="sticker-page__coil">
            {/* The habit's own coil, fully wound, as the editor shows it; unlit when it logs nothing. */}
            <div className="coil coil--still" aria-hidden="true">
              {habit ? <Coil kind={habit.kind} target={habit.target} count={live ? habit.target : 0} /> : <Coil kind="goal" target={3} count={0} />}
            </div>
          </div>

          <section className="pick" aria-labelledby="pick-title">
            <h2 id="pick-title" className="section__title">
              {live ? "Move it to" : habit ? "Or move it to" : "Which habit?"}
            </h2>
            {others.length > 0 ? (
              <ul>
                {others.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="pick__habit"
                      style={habitVars(h.color)}
                      aria-disabled={busy || undefined}
                      onClick={() => run(() => move(h.id))}
                    >
                      <span className="pick__swatch" aria-hidden="true" />
                      <span className="pick__name">
                        <span className="trace">{h.name}</span>
                      </span>
                      <span className="pick__kind">{targetText(h.kind, h.target, h.period)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="stickers__note">
                No other habit to move it to. <Link href={newHref}>Make one</Link>
              </p>
            )}
          </section>

          <section className="pick" aria-label="Name">
            <LineForm label="Name" button="Save" initial={label} send={rename} />
          </section>

          {link ? (
            <section className="pick" aria-label="New link">
              <LinkPanel label={label} link={link} replaced onDone={() => setLink(null)} />
            </section>
          ) : (
            <div className="editor__more sticker-page__more">
              {confirm === "link" ? (
                <div className="editor__confirm">
                  <p>The sticker stops logging until it holds the new link.</p>
                  <button type="button" className="button" autoFocus aria-disabled={busy || undefined} onClick={() => run(newLink)}>
                    Make a new link
                  </button>
                  <button type="button" className="button button--line" onClick={() => setConfirm(null)}>
                    Keep this one
                  </button>
                </div>
              ) : confirm === "remove" ? (
                <div className="editor__confirm">
                  <p>
                    Removes {label}, and its link stops working.
                    {view.taps > 0 && ` Its ${view.taps} ${view.taps === 1 ? "tap stays" : "taps stay"}.`}
                  </p>
                  <button type="button" className="button" autoFocus aria-disabled={busy || undefined} onClick={() => run(remove)}>
                    Remove {label}
                  </button>
                  <button type="button" className="button button--line" onClick={() => setConfirm(null)}>
                    Keep it
                  </button>
                </div>
              ) : (
                <>
                  <button type="button" className="button button--line" onClick={() => setConfirm("link")}>
                    New link
                  </button>
                  <button type="button" className="button button--line button--short" onClick={() => setConfirm("remove")}>
                    Remove
                  </button>
                </>
              )}
            </div>
          )}
          {error && (
            <p className="day__error sticker-page__error" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
      <Footer {...frame} />
    </div>
  );
}
