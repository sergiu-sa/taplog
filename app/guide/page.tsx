import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { habitVars } from "@/lib/palette";
import { readTheme } from "@/lib/theme";
import { Footer } from "../frame";
import { SECTIONS } from "./copy";
import { DRAW } from "./drawings";
import { DrawIn, Film } from "./film";
import { BLUE } from "./parts";

// The card a shared link shows; the image is opengraph-image.jpg beside this file.
export const metadata: Metadata = {
  title: "How it works",
  openGraph: {
    title: "taplog: like tap to pay, but for habits",
    description: "A habit log you feed by tapping NFC stickers with your phone.",
    siteName: "taplog",
    type: "website",
  },
};

// Public on purpose: it reads no session and no data, so unlike every other page it has no
// getClaims() check and stays out of proxy.ts's matcher.
export default async function GuidePage() {
  return (
    <div className="page guide">
      <header className="masthead">
        <Link href="/" prefetch={false} className="trace">
          taplog
        </Link>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="guide__hero" aria-labelledby="guide-title">
          <h1 id="guide-title" className="guide__title">
            One tap, one turn
          </h1>
          <p className="guide__deck">A sticker for each habit. Tap it to count.</p>
          <Film />
        </section>
        {SECTIONS.map((s, i) => (
          <section key={s.title} className="guide__sec" aria-labelledby={`guide-s${i}`}>
            <h2 id={`guide-s${i}`} className="guide__h2">
              {s.title}
            </h2>
            <ol className="guide__strip" data-tight={s.tight || undefined} data-big={s.big || undefined} style={s.cols ? ({ "--cols-d": s.cols } as CSSProperties) : undefined}>
              {[...s.steps, ...(s.warn ? [s.warn] : [])].map((step) => (
                <li key={step.key} data-warn={step === s.warn || undefined}>
                  <figure>
                    <svg className="guide__art guide__hc" viewBox="0 0 160 160" role="img" aria-label={step.alt} style={habitVars(BLUE)}>
                      {DRAW[step.key]()}
                    </svg>
                    <figcaption>
                      {step.cap}{" "}
                      <span className="guide__note">{step.note}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <p className="guide__end">
          <Link href="/" prefetch={false} className="button">
            Open taplog
          </Link>
        </p>
      </main>
      <Footer theme={await readTheme()} guide={false} />
      <DrawIn />
    </div>
  );
}
