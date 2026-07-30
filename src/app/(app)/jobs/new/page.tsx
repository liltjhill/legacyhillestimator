import { prisma } from "@/lib/prisma";
import { NewJobForm } from "./new-job-form";

export default async function NewJobPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New job</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Start a job for a client and site address. You&apos;ll add the site-visit recording and
        scope next.
      </p>
      <NewJobForm clients={clients} />
    </div>
  );
}
