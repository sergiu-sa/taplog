import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { readTheme } from "@/lib/theme";
import "./globals.css";

const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });

export const metadata: Metadata = {
  title: { default: "taplog", template: "%s · taplog" },
  description: "A private habit log fed by NFC sticker taps, counted per Oslo day.",
  robots: { index: false, follow: false },
};

// The chosen theme arrives in the server's HTML, so the first frame is right without a script.
// Reading the cookie renders every page per request, /login included.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await readTheme();
  return (
    <html lang="en" className={sans.variable} data-theme={theme}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
