"use client";

import { useRef, useState, useTransition } from "react";
import { createScopeItem, draftScopeFromTranscript, type PriceListSearchResult } from "./scope-actions";
import { ScopeItemRow } from "./scope-item-row";
import { ScopeCatalogSearch } from "./scope-catalog-search";
import { ApplyTemplateModal } from "./apply-template-modal";

type ScopeItem = {
  id: string;
  room: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  aiDrafted: boolean;
};

type TemplateOption = { id: string; title: string; unitType: string };

export function ScopeSection({
  jobId,
  scopeItems,
  transcript,
  templates,
}: {
  jobId: string;
  scopeItems: ScopeItem[];
  transcript: string | null;
  templates: TemplateOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const [isDrafting, startDrafting] = useTransition();
  const [draftError, setDraftError] = useState<string | null>(null);
  const hasAiDraft = scopeItems.some((item) => item.aiDrafted);

  function applyCatalogItem(item: PriceListSearchResult) {
    if (descriptionRef.current) descriptionRef.current.value = item.name;
    if (unitRef.current) unitRef.current.value = item.unit;
    if (categoryRef.current) categoryRef.current.value = item.category ?? "";
    quantityRef.current?.focus();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Scope of work</h2>
        <div className="flex items-center gap-2">
          <ApplyTemplateModal jobId={jobId} templates={templates} />
          <button
            disabled={!transcript || isDrafting}
            onClick={() => {
              if (
                hasAiDraft &&
                !confirm(
                  "This replaces the current AI-drafted scope items with a fresh draft from the transcript. " +
                    "Manually added items are kept, but any edits to AI-drafted items will be lost. Continue?",
                )
              ) {
                return;
              }
              setDraftError(null);
              startDrafting(async () => {
                try {
                  await draftScopeFromTranscript(jobId, transcript ?? "");
                } catch (error) {
                  setDraftError(error instanceof Error ? error.message : "Failed to draft scope.");
                }
              });
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {isDrafting ? "Drafting..." : hasAiDraft ? "Redraft from transcript" : "Draft from transcript"}
          </button>
        </div>
      </div>
      {!transcript && (
        <p className="mt-1 text-xs text-zinc-400">
          Upload and transcribe a site visit recording above to enable AI drafting.
        </p>
      )}
      {draftError && <p className="mt-1 text-xs text-red-600">{draftError}</p>}

      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Room</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Description</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Qty</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Category</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {scopeItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-sm text-zinc-500">
                  No scope items yet.
                </td>
              </tr>
            )}
            {scopeItems.map((item) => (
              <ScopeItemRow key={item.id} item={item} jobId={jobId} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Search your price list to pull in a standard item, or fill in a custom one below.
        </p>
        <ScopeCatalogSearch onSelect={applyCatalogItem} />
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await createScopeItem(jobId, formData);
          formRef.current?.reset();
        }}
        className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-zinc-300 p-3 sm:grid-cols-6 dark:border-zinc-700"
      >
        <input name="room" placeholder="Room" className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <input
          ref={descriptionRef}
          name="description"
          required
          placeholder="Description"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          ref={quantityRef}
          name="quantity"
          type="number"
          step="0.01"
          min="0"
          placeholder="Qty"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          ref={unitRef}
          name="unit"
          placeholder="Unit"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          ref={categoryRef}
          name="category"
          placeholder="Category"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 sm:col-span-6 sm:w-fit dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add item
        </button>
      </form>
    </div>
  );
}
