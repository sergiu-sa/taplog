"use client";

import { useEffect, useState } from "react";
import { osloTime } from "@/lib/habits";

// "Next from 15:40" for a spaced limit, until 15:40. The line keeps its room when empty, so
// nothing under it moves. A plain timer, not GSAP's: that ticker stops in a hidden tab.
export function NextFrom({ at }: { at: string | null }) {
  // The time that has passed, rather than a flag: a new `at` shows without a reset.
  const [passed, setPassed] = useState<string | null>(null);

  useEffect(() => {
    if (!at) return;
    const check = () => Date.now() >= Date.parse(at) && setPassed(at);
    const timer = setTimeout(check, Date.parse(at) - Date.now());
    // A phone that slept can fire the timer late, so look again when the page is back.
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [at]);

  return <p className="habit__next">{at && passed !== at && `Next from ${osloTime(at)}`}</p>;
}
