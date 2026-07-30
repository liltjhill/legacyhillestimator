"use client";

import { useRef } from "react";
import { createPriceListItem } from "./actions";

export function NewItemForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createPriceListItem(formData);
        formRef.current?.reset();
      }}
      className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-6 dark:border-zinc-700"
    >
      <input
        name="name"
        required
        placeholder="Name (e.g. Interior door, hung)"
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="category"
        placeholder="Category (e.g. Doors)"
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="unit"
        required
        placeholder="Unit (e.g. each)"
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="materialCost"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="Material $"
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="laborCost"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="Labor $"
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-5 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add item
      </button>
    </form>
  );
}
