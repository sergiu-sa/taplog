"use client";

import { useActionState } from "react";

export function UndoButton({
  id,
  sig,
  action,
}: {
  id: string;
  sig: string;
  action: (prev: string | null, formData: FormData) => Promise<string | null>;
}) {
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="sig" value={sig} />
      <button
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-neutral-100 text-lg font-medium active:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-900 dark:active:bg-neutral-800"
      >
        {pending ? "Undoing…" : "Undo"}
      </button>
      <p aria-live="polite" className="mt-3 h-5 text-center text-sm text-neutral-500">
        {error}
      </p>
    </form>
  );
}
