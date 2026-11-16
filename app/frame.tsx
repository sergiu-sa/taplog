import Link from "next/link";
import type { Theme } from "@/lib/theme";
import { Reminders, type AddDevice, type RemoveDevice } from "./reminders";
import { SignOut, type SignOutEverywhere, type SignOutLocal } from "./sign-out";
import { ThemeSwitch } from "./theme-switch";

const SOURCE = "https://github.com/sergiu-sa/taplog";

// What every signed-in page's footer needs from its loader. The preview passes no-op actions.
export type Frame = { theme?: Theme; signOut: SignOutLocal; signOutEverywhere: SignOutEverywhere; addDevice: AddDevice; removeDevice: RemoveDevice };

// The header's way to a new habit: the empty die-cut mark and its name.
export function NewHabit({ href, current }: { href: string; current?: boolean }) {
  return (
    <Link href={href} prefetch={false} className="new-habit" aria-current={current ? "page" : undefined}>
      <span className="new-habit__mark" aria-hidden="true" />
      <span className="trace">New habit</span>
    </Link>
  );
}

// One footer for every page that can carry the theme switch: /logged's budget and the root
// not-found boundary can't. Signed in, it adds the counts' reset and sign-out; signed out, it
// tells a visitor there's no sign-up and links the code.
export function Footer({
  theme,
  signOut,
  signOutEverywhere,
  addDevice,
  removeDevice,
  weekly,
  guide = true,
}: Partial<Frame> & { weekly?: boolean; guide?: boolean }) {
  const signedIn = signOut && signOutEverywhere;
  return (
    <footer className="foot">
      {signedIn ? (
        <p>
          <span>Counts reset at midnight, Oslo time.</span>
          {weekly && <span>Weekly counts start again each Monday.</span>}
        </p>
      ) : (
        <p>taplog is a personal tool, with no sign-up.</p>
      )}
      <div className="foot__controls">
        {guide && (
          <Link href="/guide" prefetch={false} className="trace">
            How it works
          </Link>
        )}
        {!signedIn && (
          <a href={SOURCE} className="trace">
            Code on GitHub
          </a>
        )}
        <ThemeSwitch theme={theme} />
        {signedIn && addDevice && removeDevice && <Reminders add={addDevice} remove={removeDevice} />}
        {signedIn && <SignOut local={signOut} everywhere={signOutEverywhere} />}
      </div>
    </footer>
  );
}
