import type { ReactNode } from "react";
import { Coil } from "./coil";

// The 404s: an unlit coil whose outer turn never closes.
// Plain links, not next/link: the root not-found boundary ships its client code with every
// page, and /logged's budget has no room for the Link chunk.
/* eslint-disable @next/next/no-html-link-for-pages */
export function Gone({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page">
      <header className="masthead">
        <a href="/" className="trace">
          taplog
        </a>
      </header>
      <main id="main" tabIndex={-1} className="pair">
        <div className="pair__coil coil coil--still" aria-hidden="true">
          <Coil kind="goal" target={3} count={0} broken />
        </div>
        <div className="pair__text">
          <h1 className="title">{title}</h1>
          {children && <p className="pair__body">{children}</p>}
          <BackToToday />
        </div>
      </main>
    </div>
  );
}

export function BackToToday() {
  return (
    <p className="pair__more">
      <a href="/" className="trace">
        Back to today
      </a>
    </p>
  );
}
