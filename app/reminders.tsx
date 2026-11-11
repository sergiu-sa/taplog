"use client";

import { useEffect, useId, useState, useTransition } from "react";

export type AddDevice = (endpoint: string, p256dh: string, auth: string) => Promise<boolean>;
export type RemoveDevice = (endpoint: string) => Promise<void>;

type State = "unknown" | "none" | "blocked" | "off" | "on";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SEEN = "reminders-checked";

// This browser's push subscription, or null: also where the browser has no push at all.
export async function thisDevice() {
  try {
    return (await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

function parts(sub: PushSubscription) {
  const { endpoint, keys } = sub.toJSON();
  return [endpoint ?? "", keys?.p256dh ?? "", keys?.auth ?? ""] as const;
}

// Safari takes the key as bytes; a base64url string isn't accepted everywhere.
const bytes = (key: string) => Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function look(add: AddDevice): Promise<State> {
  // An iPhone's browser tab has no PushManager; only the home-screen app does.
  if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "none";
  if (Notification.permission === "denied") return "blocked";
  const sub = await thisDevice();
  if (!sub) return "off";
  // Once a visit: Sign out everywhere, or a push service's "gone", removes the server's row
  // while the browser keeps its subscription, and On would be a lie.
  let seen = false;
  try {
    seen = !!sessionStorage.getItem(SEEN);
  } catch {}
  if (!seen) {
    if (!(await add(...parts(sub)))) return "off";
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {}
  }
  return "on";
}

async function turnOn(add: AddDevice): Promise<State> {
  // Asked first, straight from the tap: iOS only shows its prompt inside one.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  await navigator.serviceWorker.register("/sw.js");
  const worker = await navigator.serviceWorker.ready;
  const sub = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(KEY!) });
  if (!(await add(...parts(sub)))) throw new Error("not stored");
  return "on";
}

async function turnOff(remove: RemoveDevice): Promise<State> {
  const sub = await thisDevice();
  if (sub) {
    await remove(sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

// Notifications for this device, in the footer beside Theme: both belong to the device, not
// to a habit. Which habits nudge is each habit's own switch, in its editor.
export function Reminders({ add, remove }: { add: AddDevice; remove: RemoveDevice }) {
  const id = useId();
  const [state, setState] = useState<State>("unknown");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    look(add).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [add]);

  function pick(on: boolean) {
    if (busy || state === (on ? "on" : "off")) return;
    setError("");
    startTransition(async () => {
      try {
        setState(await (on ? turnOn(add) : turnOff(remove)));
      } catch {
        setError(on ? "Reminders didn't turn on. Try again." : "Didn't save. Try again.");
      }
    });
  }

  if (state === "none" || state === "blocked") {
    return (
      <p className="foot__remind">
        <span>Reminders</span>
        {state === "none" ? "In the home-screen app only" : "Blocked in this device's settings"}
      </p>
    );
  }
  return (
    <>
      <div className="words" role="radiogroup" aria-labelledby={id} aria-busy={busy || undefined}>
        <span id={id}>Reminders</span>
        {[true, false].map((on) => (
          <label key={String(on)}>
            <input type="radio" name="reminders" checked={state === (on ? "on" : "off")} onChange={() => pick(on)} />
            <span className="trace">{on ? "On" : "Off"}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="day__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
