// Where sign-in sends you back to. `next` arrives from the address bar or a form field, so it
// can be anything; only a path on this site survives, everything else lands on Today.
const HERE = "https://taplog.invalid";

export function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  let url: URL;
  try {
    url = new URL(value, HERE);
  } catch {
    return "/";
  }
  // "/.//evil.com" parses on this origin with the path "//evil.com", which a browser
  // reads as another host when it's sent back as a Location.
  if (url.origin !== HERE || url.pathname.startsWith("//")) return "/";
  return url.pathname + url.search;
}

export const loginPath = (next: string) => (next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
