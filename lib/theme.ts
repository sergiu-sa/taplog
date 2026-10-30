import { cookies } from "next/headers";

export type Theme = "light" | "dark";

// Undefined means System. The browser writes this cookie, so anything but the two names is ignored.
export async function readTheme(): Promise<Theme | undefined> {
  const value = (await cookies()).get("theme")?.value;
  return value === "light" || value === "dark" ? value : undefined;
}
