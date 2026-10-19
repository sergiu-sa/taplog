"use client";

import { useFormStatus } from "react-dom";

// Disabled while the insert runs, so a double tap logs once.
export function AddButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      aria-label={`Add one ${name}`}
      className="h-12 w-full rounded-2xl bg-neutral-100 text-lg font-medium active:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-900 dark:active:bg-neutral-800"
    >
      +1
    </button>
  );
}
