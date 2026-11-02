"use client";

import { useEffect, useState } from "react";
import { osloTime } from "@/lib/habits";

// "Next from 15:40" for a spaced limit, until 15:40, and never at or over the limit: the status
// already says stop. A plain timer, not GSAP's: that ticker stops in a hidden tab.
export function NextFrom({ at, count, target, className = "habit__next" }: { at: string | null; count: number; target: number; className?: string }) {
  // The time that has passed, rather than a flag: a new `at` shows without a reset.
  const [passed, setPassed] = useState<string | null>(null);

  useEffect(() => {
    if (!at) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A timer can run a hair before Date.now() reaches its time, so one that finds time left waits again.
    const check = () => {
      clearTimeout(timer);
      const left = Date.parse(at) - Date.now();
      if (left > 0) timer = setTimeout(check, left);
      else setPassed(at);
    };
    timer = setTimeout(check, Date.parse(at) - Date.now());
    // A phone that slept can fire the timer late, so look again when the page is back.
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [at]);

  return <p className={className}>{at && passed !== at && count < target && `Next from ${osloTime(at)}`}</p>;
}
