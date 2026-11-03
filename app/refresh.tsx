"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cookieTheme, show } from "./theme-switch";

// Sticker taps log in the default browser, never in the home-screen app, and the app has no
// pull to refresh, so it fetches the page again whenever it comes back to the screen.
export function Refresh() {
  const router = useRouter();
  useEffect(() => {
    const back = () => {
      if (document.visibilityState !== "visible") return;
      // Another window may have changed the theme cookie. A pick changes this page without a render,
      // so the refetch can look unchanged to React and write nothing: put the cookie's theme on first.
      show(cookieTheme());
      router.refresh();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [router]);
  return null;
}
