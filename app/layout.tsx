import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { GROUND } from "@/lib/palette";
import { readTheme } from "@/lib/theme";
import "./globals.css";

const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });

export const metadata: Metadata = {
  title: { default: "taplog", template: "%s · taplog" },
  description: "A private habit log fed by NFC sticker taps, counted per Oslo day.",
  robots: { index: false, follow: false },
  // Otherwise the Home Screen offers the page title, "Today · taplog".
  appleWebApp: { title: "taplog" },
};

// The chosen theme arrives in the server's HTML, so the first frame is right without a script.
// Reading the cookie renders every page per request, /login included.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await readTheme();
  return (
    <html lang="en" className={sans.variable} data-theme={theme}>
      <head>
        {/* Here rather than in generateViewport, which each navigation re-sends and Back restores
            from before a pick. Like data-theme, these stay put; ThemeSwitch rewrites both. */}
        {(["light", "dark"] as const).map((scheme) => (
          <meta key={scheme} name="theme-color" media={`(prefers-color-scheme: ${scheme})`} content={GROUND[theme ?? scheme]} />
        ))}
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
