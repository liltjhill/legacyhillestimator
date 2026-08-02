"use client";

import { useState } from "react";
import { updateEstimateLineItem, deleteEstimateLineItem } from "./estimate-actions";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  materialCost: number;
  laborCost: number;
  markupPct: number;
  clientPrice: number;
  aiEstimated: boolean;
  aiConfidenceNote: string | null;
  needsMeasurement: boolean;
};

export function EstimateLineItemRow({
  item,
  estimateId,
  jobId,
}: {
  item: LineItem;
  estimateId: string;
  jobId: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <td colSpan={4} className="px-2 py-3">
          <form
            action={async (formData) => {
              await updateEstimateLineItem(item.id, estimateId, jobId, formData);
              setEditing(false);
            }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-6"
          >
            <input
              name="description"
              defaultValue={item.description}
              required
              className="rounded border border-zinc-300 px-2 py-1 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="quantity"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.quantity}
              required
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
              name="materialCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.materialCost}
              required
              placeholder="Material $/unit"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="laborCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.laborCost}
              required
              placeholder="Labor $/unit"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="markupPct"
              type="number"
              step="0.1"
              min="0"
              defaultValue={item.markupPct}
              required
              placeholder="Markup %"
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
      <td className="px-2 py-2 text-sm">
        {item.description}
        {item.needsMeasurement && (
          <span
            title="No quantity was given for this item, so it's priced at $0 - enter a real measurement."
            className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-950 dark:text-red-300"
          >
            Needs measurement
          </span>
        )}
        {item.aiEstimated && (
          <span
            title={item.aiConfidenceNote ?? "AI-estimated cost"}
            className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          >
            AI-estimated — verify
          </span>
        )}
        {item.aiConfidenceNote && (
          <p className="mt-0.5 text-xs text-zinc-400">{item.aiConfidenceNote}</p>
        )}
      </td>
      <td className="px-2 py-2 text-sm text-zinc-500">
        {item.quantity} {item.unit ?? ""}
      </td>
      <td className="px-2 py-2 text-sm font-medium">${item.clientPrice.toFixed(2)}</td>
      <td className="px-2 py-2 text-right text-sm">
        <button
          onClick={() => setEditing(true)}
          className="mr-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          Edit
        </button>
        <form action={() => deleteEstimateLineItem(item.id, estimateId, jobId)} className="inline">
          <button type="submit" className="text-red-600 hover:text-red-800">
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}
