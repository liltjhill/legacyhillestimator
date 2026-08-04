"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { importTemplate } from "./template-actions";

type Row = Record<string, string>;

function num(v: string | undefined) {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

export function TemplateCsvImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleImport() {
    setError(null);
    setResult(null);
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setError("Choose one or more CSV files (one export per Clear Estimates template).");
      return;
    }

    setIsImporting(true);
    try {
      const importedTitles: string[] = [];

      for (const file of Array.from(files)) {
        const rows = await new Promise<Row[]>((resolve, reject) => {
          Papa.parse<Row>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err: Error) => reject(err),
          });
        });

        const byTitle = new Map<string, Row[]>();
        for (const row of rows) {
          const title = row["TEMPLATE TITLE"]?.trim();
          if (!title) continue;
          const group = byTitle.get(title);
          if (group) group.push(row);
          else byTitle.set(title, [row]);
        }

        if (byTitle.size === 0) {
          throw new Error(`${file.name}: doesn't look like a Clear Estimates template export.`);
        }

        for (const [title, group] of byTitle) {
          const lineItems = group
            .filter((r) => r["PART DESCRIPTION"]?.trim())
            .map((r) => ({
              category: r["PART CATEGORY TITLE"],
              description: r["PART DESCRIPTION"],
              supplierCode: r["SUPPLIER CODE"],
              fixedUnits: num(r["FIXED NUMBER OF UNITS"]),
              unitsPerPiece: num(r["UNITSPERPIECE"]),
              unitEveryXPieces: num(r["1 UNIT EVERY X PIECES"]),
            }));

          if (lineItems.length === 0) continue;

          await importTemplate({
            title,
            description: group[0]["TEMPLATE DESCRIPTION"],
            unitType: group[0]["TEMPLATE UNIT TYPE"] || "each",
            lineItems,
          });
          importedTitles.push(title);
        }
      }

      if (importedTitles.length === 0) {
        setError("No templates found in the selected file(s).");
        return;
      }

      router.refresh();
      setResult(
        `Imported ${importedTitles.length} template${importedTitles.length === 1 ? "" : "s"}: ` +
          importedTitles.join(", "),
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
        Import from Clear Estimates
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Export a template from Clear Estimates as CSV and upload it here. Clear Estimates only
        exports one template at a time, so you can select several files at once here to import
        them together. Re-importing a template with the same title replaces its items.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-zinc-500">CSV file(s)</label>
          <input ref={fileInputRef} type="file" accept=".csv" multiple className="mt-1 text-sm" />
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {result && <p className="mt-2 text-xs text-green-600">{result}</p>}
    </div>
  );
}
