import type { ReactNode } from "react";
import { formatGap, type Kind, type Tone } from "@/lib/habits";
import { habitVars } from "@/lib/palette";
import { Coil } from "../coil";
import { BackToToday } from "../gone";
import { NextFrom } from "../next-from";

// What a sticker tap opens. No client code of its own: the coil is drawn on the server and
// its newest turn draws in by CSS; only Undo and the "Next from" timer run in the browser.
type LoggedProps = {
  dup: boolean;
  fresh: boolean; // just logged, so the newest turn draws in
  name: string;
  kind: Kind;
  color: string;
  when: string;
  count: number;
  target: number;
  status: { tone: Tone; label: string };
  since: string | null;
  next: string | null;
  undo: ReactNode;
};

export function sinceLine(created: number, previous: string | undefined) {
  return previous ? `${formatGap(created - Date.parse(previous))} since the previous one` : "First one logged";
}

export function LoggedView(p: LoggedProps) {
  return (
    <div className="page logged" style={habitVars(p.color)}>
      <main id="main" tabIndex={-1} className="logged__main">
        <div className="logged__head">
          <p className="logged__meta">{p.dup ? "Already counted" : "Logged"}</p>
          <h1 className="title">{p.name}</h1>
        </div>
        <div className="logged__coil coil coil--still" aria-hidden="true">
          <Coil kind={p.kind} target={p.target} count={p.count} fresh={p.fresh && !p.dup} />
        </div>
        <div className="logged__tally">
          <p className="logged__meta">{p.when}</p>
          <p className="count">
            <span className="count__n">{p.count}</span>
            <span className="count__of">/{p.target}</span>
          </p>
          <p className="habit__status" data-tone={p.status.tone}>
            {p.status.label}
          </p>
          {p.since && <p className="logged__line">{p.since}</p>}
          {/* A sticker tap leaves this page as the open tab, so the line goes at its time here too. */}
          {p.next && <NextFrom at={p.next} count={p.count} target={p.target} className="logged__line" />}
        </div>
        {p.undo && <div className="logged__undo">{p.undo}</div>}
      </main>
    </div>
  );
}

// The row is gone, so there's no habit to draw: an open circuit instead.
export function LoggedUndone() {
  return (
    <div className="page logged">
      <main id="main" tabIndex={-1} className="logged__main">
        <div className="logged__head">
          <p className="logged__meta">Undone</p>
          <h1 className="title">That tap was removed</h1>
        </div>
        <div className="logged__coil coil coil--still" aria-hidden="true">
          <Coil kind="goal" target={1} count={0} broken />
        </div>
        <div className="logged__tally">
          <p className="pair__body">It no longer counts.</p>
          <BackToToday />
        </div>
      </main>
    </div>
  );
}
