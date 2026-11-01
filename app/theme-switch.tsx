"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import type { Theme } from "@/lib/theme";

const CHOICES: [Theme | undefined, string][] = [
  [undefined, "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

const cookieTheme = () => document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/)?.[1] as Theme | undefined;

function show(theme?: Theme) {
  const html = document.documentElement;
  if (theme) html.dataset.theme = theme;
  else delete html.dataset.theme;
}

// The cookie is for the server's next render; the attribute switches this page now, with no
// round trip. System clears both, so the page follows the device again.
function pick(theme?: Theme) {
  show(theme);
  document.cookie = theme ? `theme=${theme}; path=/; max-age=31536000; samesite=lax` : "theme=; path=/; max-age=0";
}

const subscribe = () => () => {};

// A radiogroup rather than a fieldset: WebKit won't lay a legend out in a row with its radios.
export function ThemeSwitch({ theme }: { theme?: Theme }) {
  const id = useId();
  // The cookie holds the live choice. Back rebuilds this page from the router's cache, with the
  // theme of its first load, so the server's value only seeds hydration.
  const current = useSyncExternalStore(subscribe, cookieTheme, () => theme);

  // A +1's response, sent before a pick, renders <html> with the old theme; put the cookie's back.
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      if (html.dataset.theme !== cookieTheme()) show(cookieTheme());
    });
    observer.observe(html, { attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="words" role="radiogroup" aria-labelledby={id}>
      <span id={id}>Theme</span>
      {CHOICES.map(([value, name]) => (
        <label key={name}>
          <input type="radio" name="theme" defaultChecked={value === current} onChange={() => pick(value)} />
          <span className="trace">{name}</span>
        </label>
      ))}
    </div>
  );
}
