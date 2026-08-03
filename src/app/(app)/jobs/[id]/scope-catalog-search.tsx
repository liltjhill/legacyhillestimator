"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchPriceListForScope, type PriceListSearchResult } from "./scope-actions";

const SEARCH_DEBOUNCE_MS = 250;

export function ScopeCatalogSearch({
  onSelect,
}: {
  onSelect: (item: PriceListSearchResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PriceListSearchResult[]>([]);
  const [isSearching, startSearching] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSearching(async () => {
        setResults(await searchPriceListForScope(query));
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Search price list
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
                Search price list
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. toilet, vinyl flooring, cabinet..."
              className="mt-3 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="mt-3 max-h-80 overflow-y-auto">
              {!query.trim() && (
                <p className="text-xs text-zinc-400">Start typing to search your price list catalog.</p>
              )}
              {query.trim() && isSearching && <p className="text-xs text-zinc-400">Searching…</p>}
              {query.trim() && !isSearching && results.length === 0 && (
                <p className="text-xs text-zinc-400">
                  No matches. Close this and add a custom scope item below instead.
                </p>
              )}
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {results.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="text-sm text-zinc-900 dark:text-zinc-50">{item.name}</p>
                      <p className="text-xs text-zinc-400">
                        {item.category ?? "Uncategorized"} · {item.unit} · $
                        {(item.materialCost + item.laborCost).toFixed(2)}/{item.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                        setQuery("");
                        setResults([]);
                      }}
                      className="shrink-0 rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Use this
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
