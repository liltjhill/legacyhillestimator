"use client";

import { useState, useTransition } from "react";
import { generateEstimate, markEstimateSent } from "./estimate-actions";
import { EstimateLineItemRow } from "./estimate-line-item-row";

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

type Estimate = {
  id: string;
  version: number;
  materialSubtotal: number;
  laborSubtotal: number;
  total: number;
  sentAt: Date | null;
  lineItems: LineItem[];
};

export function EstimateSection({
  jobId,
  scopeItemCount,
  latestEstimate,
}: {
  jobId: string;
  scopeItemCount: number;
  latestEstimate: Estimate | null;
}) {
  const [isGenerating, startGenerating] = useTransition();
  const [isSending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Estimate</h2>
        <button
          disabled={scopeItemCount === 0 || isGenerating}
          onClick={() => {
            setError(null);
            startGenerating(async () => {
              try {
                await generateEstimate(jobId);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to generate estimate.");
              }
            });
          }}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {isGenerating
            ? "Generating..."
            : latestEstimate
              ? "Regenerate estimate"
              : "Generate estimate"}
        </button>
      </div>
      {scopeItemCount === 0 && (
        <p className="mt-1 text-xs text-zinc-400">Add scope items above before generating an estimate.</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {latestEstimate && (
        <div className="mt-3">
          {latestEstimate.lineItems.some((item) => item.needsMeasurement) && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              Some line items are missing a quantity and are priced at $0 until you add a real
              measurement - look for the &quot;Needs measurement&quot; tag below.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Description</th>
                  <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Qty</th>
                  <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Price</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {latestEstimate.lineItems.map((item) => (
                  <EstimateLineItemRow
                    key={item.id}
                    item={item}
                    estimateId={latestEstimate.id}
                    jobId={jobId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Material</span>
              <span>${latestEstimate.materialSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Labor</span>
              <span>${latestEstimate.laborSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-1 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              <span>Total</span>
              <span>${latestEstimate.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <a
              href={`/api/estimates/${latestEstimate.id}/pdf`}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Download PDF
            </a>
            <button
              disabled={isSending || Boolean(latestEstimate.sentAt)}
              onClick={() => startSending(() => markEstimateSent(latestEstimate.id, jobId))}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {latestEstimate.sentAt ? "Marked as sent" : isSending ? "Marking..." : "Mark as sent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
