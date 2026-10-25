import { ViewTransition, type ReactNode } from "react";

// The habit page opens out of its coil and closes back into it ("curtain" in globals.css).
// React leaves the root out of these navigations, so each page runs its own enter and exit.
// Only the app's links carry the types; browser back and reloads swap at once.
export function PageTurn({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "curtain-open", "nav-back": "curtain-rise", default: "none" }}
      exit={{ "nav-forward": "curtain-fall", "nav-back": "curtain-close", default: "none" }}
      default="none"
    >
      <div className="turn">{children}</div>
    </ViewTransition>
  );
}
