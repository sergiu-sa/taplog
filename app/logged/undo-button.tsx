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
      <button disabled={pending} className="button button--wide">
        {pending ? "Undoing…" : "Undo"}
      </button>
      <p aria-live="polite" className="logged__note">
        {error}
      </p>
    </form>
  );
}
