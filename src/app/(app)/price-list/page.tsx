import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PriceItemRow } from "./price-item-row";
import { NewItemForm } from "./new-item-form";
import { CsvImport } from "./csv-import";

const PAGE_SIZE = 50;

export default async function PriceListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
  };

  const [items, totalCount, categoryRows] = await Promise.all([
    prisma.priceListItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.priceListItem.count({ where }),
    prisma.priceListItem.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const categories = categoryRows.map((c) => c.category).filter((c): c is string => Boolean(c));

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    sp.set("page", String(targetPage));
    return `/price-list?${sp.toString()}`;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Price List</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Your material and labor costs. The estimator looks these up first when pricing a scope of
        work.
      </p>

      <CsvImport />

      <form className="mt-6 flex flex-wrap gap-2" action="/price-list" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="category"
          defaultValue={category}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Filter
        </button>
        {(q || category) && (
          <Link
            href="/price-list"
            className="flex items-center text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="mt-2 text-xs text-zinc-500">
        {totalCount.toLocaleString()} item{totalCount === 1 ? "" : "s"}
        {q || category ? " matching filters" : " total"}
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Name</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Category</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Unit</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Material</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Labor</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-sm text-zinc-500">
                  {q || category
                    ? "No price list items match these filters."
                    : "No price list items yet. Add your first one below, or import a CSV above."}
                </td>
              </tr>
            )}
            {items.map((item) => (
              <PriceItemRow
                key={item.id}
                item={{
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  unit: item.unit,
                  materialCost: Number(item.materialCost),
                  laborCost: Number(item.laborCost),
                  notes: item.notes,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            ← Previous
          </Link>
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Next →
          </Link>
        </div>
      )}

      <NewItemForm />
    </div>
  );
}
