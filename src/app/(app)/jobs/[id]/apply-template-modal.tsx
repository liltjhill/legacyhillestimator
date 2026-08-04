"use client";

import { useState, useTransition } from "react";
import {
  previewTemplateApplication,
  applyTemplateToJob,
  type TemplatePreviewLineItem,
} from "./scope-actions";

type TemplateOption = { id: string; title: string; unitType: string };

export function ApplyTemplateModal({
  jobId,
  templates,
}: {
  jobId: string;
  templates: TemplateOption[];
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [sizeInput, setSizeInput] = useState("");
  const [preview, setPreview] = useState<TemplatePreviewLineItem[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isPreviewing, startPreviewing] = useTransition();
  const [isApplying, startApplying] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (templates.length === 0) return null;

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function runPreview() {
    setError(null);
    const size = Number(sizeInput);
    if (!templateId || !Number.isFinite(size) || size <= 0) {
      setError("Choose a template and enter a size greater than 0.");
      return;
    }
    startPreviewing(async () => {
      try {
        const result = await previewTemplateApplication(templateId, size);
        if (result.items.length === 0) {
          setError("This template produced no items at that size.");
          setPreview(null);
          return;
        }
        setPreview(result.items);
        setSkippedCount(result.skippedCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to preview template.");
      }
    });
  }

  function confirmApply() {
    const size = Number(sizeInput);
    startApplying(async () => {
      try {
        await applyTemplateToJob(jobId, templateId, size);
        setOpen(false);
        setPreview(null);
        setSizeInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to apply template.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Apply template
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Apply template
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs text-zinc-500">Template</label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    setPreview(null);
                  }}
                  className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500">{selectedTemplate?.unitType ?? "Size"}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sizeInput}
                  onChange={(e) => {
                    setSizeInput(e.target.value);
                    setPreview(null);
                  }}
                  className="mt-1 w-28 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <button
                type="button"
                disabled={isPreviewing}
                onClick={runPreview}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {isPreviewing ? "Calculating…" : "Preview"}
              </button>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            {preview && (
              <div className="mt-3">
                <p className="text-xs text-zinc-500">
                  {preview.length} item{preview.length === 1 ? "" : "s"} will be added to the
                  scope
                  {skippedCount > 0
                    ? ` (${skippedCount} skipped - they compute to zero at this size)`
                    : ""}
                  .
                </p>
                <div className="mt-2 max-h-64 overflow-y-auto rounded border border-zinc-100 dark:border-zinc-800">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {preview.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm"
                      >
                        <span className="text-zinc-900 dark:text-zinc-50">{item.description}</span>
                        <span className="shrink-0 text-zinc-500">{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={confirmApply}
                  className="mt-3 rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isApplying ? "Adding…" : `Add ${preview.length} items to scope`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
