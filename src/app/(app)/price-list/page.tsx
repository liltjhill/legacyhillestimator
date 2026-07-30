import { prisma } from "@/lib/prisma";
import { PriceItemRow } from "./price-item-row";
import { NewItemForm } from "./new-item-form";

export default async function PriceListPage() {
  const items = await prisma.priceListItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Price List</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Your material and labor costs. The estimator looks these up first when pricing a scope of
        work.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
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
                  No price list items yet. Add your first one below.
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

      <NewItemForm />
    </div>
  );
}
