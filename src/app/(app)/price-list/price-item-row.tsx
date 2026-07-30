"use client";

import { useState } from "react";
import { updatePriceListItem, deletePriceListItem } from "./actions";

type Item = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  materialCost: number;
  laborCost: number;
  notes: string | null;
};

export function PriceItemRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <td colSpan={6} className="px-2 py-3">
          <form
            action={async (formData) => {
              await updatePriceListItem(item.id, formData);
              setEditing(false);
            }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-6"
          >
            <input
              name="name"
              defaultValue={item.name}
              required
              placeholder="Name"
              className="rounded border border-zinc-300 px-2 py-1 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="category"
              defaultValue={item.category ?? ""}
              placeholder="Category"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="unit"
              defaultValue={item.unit}
              required
              placeholder="Unit"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="materialCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.materialCost}
              required
              placeholder="Material $"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="laborCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.laborCost}
              required
              placeholder="Labor $"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="notes"
              defaultValue={item.notes ?? ""}
              placeholder="Notes"
              className="rounded border border-zinc-300 px-2 py-1 text-sm sm:col-span-5 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex gap-2 sm:col-span-1">
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
      <td className="px-2 py-2 text-sm">
        {item.name}
        {item.notes && <p className="text-xs text-zinc-500">{item.notes}</p>}
      </td>
      <td className="px-2 py-2 text-sm text-zinc-500">{item.category ?? "—"}</td>
      <td className="px-2 py-2 text-sm text-zinc-500">{item.unit}</td>
      <td className="px-2 py-2 text-sm">${item.materialCost.toFixed(2)}</td>
      <td className="px-2 py-2 text-sm">${item.laborCost.toFixed(2)}</td>
      <td className="px-2 py-2 text-right text-sm">
        <button onClick={() => setEditing(true)} className="mr-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">
          Edit
        </button>
        <form
          action={async () => {
            if (confirm(`Delete "${item.name}"?`)) {
              await deletePriceListItem(item.id);
            }
          }}
          className="inline"
        >
          <button type="submit" className="text-red-600 hover:text-red-800">
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}
