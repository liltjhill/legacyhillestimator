"use client";

import { useState } from "react";
import { updateScopeItem, deleteScopeItem } from "./scope-actions";

type ScopeItem = {
  id: string;
  room: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  aiDrafted: boolean;
};

export function ScopeItemRow({ item, jobId }: { item: ScopeItem; jobId: string }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <td colSpan={5} className="px-2 py-3">
          <form
            action={async (formData) => {
              await updateScopeItem(item.id, jobId, formData);
              setEditing(false);
            }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-6"
          >
            <input
              name="room"
              defaultValue={item.room ?? ""}
              placeholder="Room"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="description"
              defaultValue={item.description}
              required
              placeholder="Description"
              className="rounded border border-zinc-300 px-2 py-1 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="quantity"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.quantity ?? ""}
              placeholder="Qty"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="unit"
              defaultValue={item.unit ?? ""}
              placeholder="Unit"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="category"
              defaultValue={item.category ?? ""}
              placeholder="Category"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex gap-2 sm:col-span-6">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="px-2 py-2 text-sm text-zinc-500">{item.room ?? "—"}</td>
      <td className="px-2 py-2 text-sm">
        {item.description}
        {item.aiDrafted && (
          <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            AI drafted
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-sm text-zinc-500">
        {item.quantity ?? ""} {item.unit ?? ""}
      </td>
      <td className="px-2 py-2 text-sm text-zinc-500">{item.category ?? "—"}</td>
      <td className="px-2 py-2 text-right text-sm">
        <button
          onClick={() => setEditing(true)}
          className="mr-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          Edit
        </button>
        <form action={() => deleteScopeItem(item.id, jobId)} className="inline">
          <button type="submit" className="text-red-600 hover:text-red-800">
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}
