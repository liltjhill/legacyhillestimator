"use client";

import { useTransition } from "react";
import { deleteTemplate } from "./template-actions";

export function DeleteTemplateButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this template? This can't be undone.")) return;
        startTransition(() => deleteTemplate(id));
      }}
      className="text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
