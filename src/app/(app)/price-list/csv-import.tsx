"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { importPriceListBatch, finishPriceListImport } from "./import-actions";

const BATCH_SIZE = 500;

const UNIT_MAP: Record<string, string> = {
  Pieces: "each",
  "Sq. Feet": "sq ft",
  "Lin. Feet": "linear ft",
  Dollars: "$",
  Hours: "hour",
  "Cu. Yds.": "cu yd",
};

function mapUnit(raw: string | undefined) {
  const trimmed = raw?.trim();
  if (!trimmed) return "each";
  return UNIT_MAP[trimmed] ?? trimmed;
}

type MappedItem = {
  externalCode: string;
  name: string;
  category?: string;
  unit: string;
  materialCost: number;
  laborCost: number;
};

/** Maps a Clear Estimates "Parts" export row to a price list item. */
function mapClearEstimatesRow(row: Record<string, string>, hourlyRate: number): MappedItem | null {
  const companyCost = parseFloat(row["COMPANY UNIT COST"] ?? "") || 0;
  const subContCost = parseFloat(row["SUB-CONT UNIT COST"] ?? "") || 0;
  const hours = parseFloat(row["HOURLY MULTIPLIER"] ?? "") || 0;
  const materialCost = companyCost > 0 ? companyCost : subContCost;
  const laborCost = hours * hourlyRate;

  if (materialCost <= 0 && laborCost <= 0) return null;

  const externalCode = row["PART CODE"]?.trim();
  const name = row["PART DESCRIPTION"]?.trim();
  if (!externalCode || !name) return null;

  return {
    externalCode,
    name,
    category: row["CATEGORY"]?.trim() || undefined,
    unit: mapUnit(row["PART UNIT TYPE"]),
    materialCost: Math.round(materialCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
  };
}

export function CsvImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hourlyRate, setHourlyRate] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleImport() {
    setError(null);
    setResult(null);
    const file = fileInputRef.current?.files?.[0];
    const rate = parseFloat(hourlyRate);

    if (!file) {
      setError("Choose a CSV file.");
      return;
    }
    if (!rate || rate <= 0) {
      setError("Enter your hourly labor rate.");
      return;
    }

    setIsImporting(true);
    setProgress(null);
    try {
      const rows = await new Promise<Record<string, string>[]>((resolve, reject) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err: Error) => reject(err),
        });
      });

      const mappedWithDuplicates = rows
        .map((row) => mapClearEstimatesRow(row, rate))
        .filter((item): item is MappedItem => item !== null);

      // The same externalCode can't be upserted twice within one batch
      // (Postgres rejects ON CONFLICT DO UPDATE hitting the same row twice
      // in a single statement), and some source files do contain duplicate
      // part codes - keep the last occurrence of each.
      const mapped = Array.from(
        new Map(mappedWithDuplicates.map((item) => [item.externalCode, item])).values(),
      );

      if (mapped.length === 0) {
        setError("No rows with cost data were found in this file.");
        return;
      }

      setProgress({ done: 0, total: mapped.length });

      for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
        const batch = mapped.slice(i, i + BATCH_SIZE);
        await importPriceListBatch(batch);
        setProgress({ done: Math.min(i + BATCH_SIZE, mapped.length), total: mapped.length });
      }

      await finishPriceListImport();
      router.refresh();
      const noCostSkipped = rows.length - mappedWithDuplicates.length;
      const duplicatesSkipped = mappedWithDuplicates.length - mapped.length;
      setResult(
        `Imported ${mapped.length} item${mapped.length === 1 ? "" : "s"}. ` +
          `Skipped ${noCostSkipped} row${noCostSkipped === 1 ? "" : "s"} with no cost data` +
          (duplicatesSkipped > 0
            ? ` and ${duplicatesSkipped} duplicate part code${duplicatesSkipped === 1 ? "" : "s"} (kept the last occurrence).`
            : "."),
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Import from Clear Estimates CSV
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        &quot;Company Unit Cost&quot; becomes material cost; labor cost is computed as hours ×
        your hourly rate below. Re-importing the same file updates existing items instead of
        duplicating them.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-zinc-500">CSV file</label>
          <input ref={fileInputRef} type="file" accept=".csv" className="mt-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500">Hourly labor rate ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="e.g. 85"
            className="mt-1 w-28 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="button"
          disabled={isImporting}
          onClick={handleImport}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isImporting ? "Importing…" : "Import CSV"}
        </button>
      </div>
      {progress && (
        <p className="mt-2 text-xs text-zinc-500">
          {progress.done} / {progress.total} items imported…
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {result && <p className="mt-2 text-xs text-green-600">{result}</p>}
    </div>
  );
}
