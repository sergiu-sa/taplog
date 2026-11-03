"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Sticker taps log in the default browser, never in the home-screen app, and the app has no
// pull to refresh, so it fetches the page again whenever it comes back to the screen.
export function Refresh() {
  const router = useRouter();
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [router]);
  return null;
}
