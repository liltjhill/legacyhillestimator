import { prisma } from "@/lib/prisma";
import { TemplateCsvImport } from "./template-csv-import";
import { DeleteTemplateButton } from "./delete-template-button";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { lineItems: true } } },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Templates</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Reusable scope templates imported from Clear Estimates. Apply one to a job to quickly
        generate a full scope of work scaled to that job&apos;s size.
      </p>

      <TemplateCsvImport />

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Title</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Scales by</th>
              <th className="px-2 py-2 text-xs font-medium uppercase text-zinc-500">Items</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-6 text-center text-sm text-zinc-500">
                  No templates yet. Import one above.
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-2 py-2 text-sm">{t.title}</td>
                <td className="px-2 py-2 text-sm text-zinc-500">{t.unitType}</td>
                <td className="px-2 py-2 text-sm text-zinc-500">{t._count.lineItems}</td>
                <td className="px-2 py-2 text-right text-sm">
                  <DeleteTemplateButton id={t.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
