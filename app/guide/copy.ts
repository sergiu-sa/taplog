// Every step of the guide: its drawing's key, its caption (at most six words), the grey line under
// it, and the full step for screen readers. The film's captions are these same captions.
type Step = { key: string; cap: string; note: string; alt: string };
// cols: how many stills a desktop row holds, so every row closes at the right edge; big: drawn larger.
type Section = { title: string; steps: Step[]; warn?: Step; tight?: boolean; cols?: number; big?: boolean };

export const SECTIONS: Section[] = [
  {
    title: "Stickers",
    cols: 2,
    steps: [
      { key: "ntag", cap: "NTAG213, 144 bytes", note: "Fits one link.", alt: "A sheet of blank NFC stickers. Buy NTAG213 stickers; each holds 144 bytes." },
      { key: "onelink", cap: "One link each", note: "Logs one habit.", alt: "Each sticker holds a link of its own, and each link logs to one habit." },
    ],
  },
  {
    title: "Where",
    tight: true,
    cols: 3,
    steps: [
      { key: "bottle", cap: "Near what it counts", note: "Where it happens.", alt: "A sticker on a water bottle: put each sticker where you do the habit." },
      { key: "metal", cap: "No metal behind it", note: "Metal stops it.", alt: "A sticker on a metal plate, its coil broken: metal behind a sticker stops it working." },
      { key: "foil", cap: "Foil blocks it", note: "Pack liners too.", alt: "A sticker on a box with a foil liner, its coil broken: foil blocks the signal." },
    ],
  },
  {
    title: "Write",
    cols: 3,
    steps: [
      { key: "wAdd", cap: "Name it, then press Add", note: "On the habit's page.", alt: "On the habit's page, under Add a sticker, name where the sticker sits and press Add." },
      { key: "wCopy", cap: "Copy link", note: "Shown only once.", alt: "The new link is shown once. Press Copy link." },
      { key: "wWrite", cap: "NFC Tools app: Write", note: "Install it first.", alt: "Open the NFC Tools app and choose Write." },
      { key: "wRecord", cap: "Add a record, URL", note: "URL holds the link.", alt: "Choose Add a record, then URL." },
      { key: "wPaste", cap: "Paste, then Write", note: "Into the field.", alt: "Paste the link into the field, then press Write." },
      { key: "wHold", cap: "Hold to the sticker", note: "Until it's written.", alt: "Hold the phone to the sticker while NFC Tools writes the link." },
      { key: "wLock", cap: "Don't lock it", note: "Links can change.", alt: "Don't lock the sticker, so it can take a new link later." },
      { key: "wCheck", cap: "Tap once to check", note: "One tap logs.", alt: "Tap the sticker once to check that it logs." },
    ],
    warn: { key: "chat", cap: "Paste it nowhere else", note: "Previews log taps.", alt: "The link is shown once. Paste it nowhere else: a chat's link preview opens it, and that logs a tap." },
  },
  {
    title: "Tap",
    cols: 3,
    steps: [
      { key: "tHold", cap: "Phone to the sticker", note: "It reads the link.", alt: "Hold the iPhone to the sticker." },
      { key: "tBanner", cap: "Open the banner", note: "Tap it.", alt: "A banner comes up on the iPhone; open it." },
      { key: "tBrowser", cap: "Your browser opens", note: "Your default one.", alt: "Your default browser opens taplog." },
      { key: "tLogged", cap: "One more turn", note: "Count plus one.", alt: "The Logged page: the coil winds one more turn and shows the count." },
      { key: "tUndo", cap: "Undo for 2 minutes", note: "Then it stays.", alt: "Undo takes the tap back, for 2 minutes." },
      { key: "tDup", cap: "Twice in 30 s: Already counted", note: "Double taps count once.", alt: "A second tap within 30 seconds logs nothing and says Already counted." },
    ],
  },
  {
    title: "By hand",
    cols: 2,
    steps: [
      { key: "hHold", cap: "Hold a coil on Today", note: "No sticker near?", alt: "No sticker near? On Today, hold a habit's coil until it winds." },
      { key: "hAdded", cap: "Added 14:02 · Undo", note: "Undo stays 6 seconds.", alt: "It adds one, says Added and the time, and offers Undo." },
    ],
  },
  {
    title: "Goal or limit",
    cols: 2,
    big: true,
    steps: [
      { key: "goal", cap: "Goal: 8 a day", note: "More is fine.", alt: "A goal of 8 a day: eight turns, all lit, the chip filled. Goal reached." },
      { key: "limit", cap: "Limit: at most 3", note: "Red means over.", alt: "A limit of at most 3: a fourth turn wound outside the edge, in red. 1 over your limit." },
      { key: "week", cap: "Or 3 a week", note: "Starts each Monday.", alt: "A habit can count by the week: a goal of 3 a week, its week drawn as a strip." },
      { key: "spacing", cap: "Next from 15:40", note: "Paces a limit.", alt: "A limit can ask for time between taps; the next one is from 15:40." },
    ],
  },
  {
    title: "Home Screen",
    steps: [
      { key: "aShare", cap: "Share, Add to Home Screen", note: "No browser bars.", alt: "In the browser, press Share, then Add to Home Screen." },
      { key: "aSignin", cap: "Sign in if it asks", note: "Its own sign-in.", alt: "Open taplog from the Home Screen, and sign in there if it asks." },
      { key: "aTap", cap: "Taps open the browser", note: "Never the app.", alt: "Sticker taps still open the browser, not the app." },
      { key: "aBack", cap: "The app catches up", note: "Switch back.", alt: "Switch back to the app and it shows the new tap." },
    ],
  },
];

export const CAP = Object.fromEntries(SECTIONS.flatMap((s) => [...s.steps, ...(s.warn ? [s.warn] : [])]).map((s) => [s.key, s.cap]));
