"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { habitStatus, osloTime, type Kind } from "@/lib/habits";
import { gsap } from "@/lib/motion";
import type { Logged, Removed } from "./actions";

export const UNDO_S = 6;

export type Add = (habitId: number, at?: string) => Promise<Logged | null>;
export type Remove = (id: number) => Promise<Removed | null>;

type Habit = { id: number; name: string; kind: Kind; target: number; count: number };

// Today's count for one habit. A hold adds one at once and the server confirms it; for a
// few seconds after, Undo takes that row back.
export function useTally({ id, name, kind, target, count: saved }: Habit, add: Add, remove: Remove) {
  const [count, change] = useOptimistic(saved, (c, n: number) => c + n);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [said, setSaid] = useState("");
  const [added, setAdded] = useState<{ id: number; time: string } | null>(null);
  // A ref, not state: it's set in the same tick as the first log, before React re-renders.
  const busy = useRef(false);

  useEffect(() => {
    if (!added) return;
    const timer = gsap.delayedCall(UNDO_S, () => setAdded(null));
    return () => void timer.kill();
  }, [added]);

  function run(n: number, say: string, action: () => Promise<boolean>) {
    if (busy.current || pending) return;
    busy.current = true;
    setFailed(false);
    setAdded(null);
    setSaid(say);
    startTransition(async () => {
      change(n);
      try {
        if (!(await action())) throw new Error("not saved");
      } catch {
        setFailed(true);
        setSaid("Didn't save. Try again.");
      } finally {
        busy.current = false;
      }
    });
  }

  const status = (n: number) => `${name}, ${n} of ${target}. ${habitStatus(kind, n, target).label}.`;

  function fire() {
    run(1, status(count + 1), async () => {
      const log = await add(id);
      if (log) setAdded({ id: log.id, time: osloTime(log.createdAt) });
      return log !== null;
    });
  }

  function undo() {
    if (!added) return;
    // Nothing removed means the row was already gone, which is what Undo wanted.
    run(-1, `Removed. ${status(count - 1)}`, async () => (await remove(added.id), true));
  }

  return { count, change, pending, failed, said, added, fire, undo };
}
