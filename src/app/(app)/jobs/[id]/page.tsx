import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusSelect } from "./status-select";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { client: true, siteVisits: true, scopeItems: true, estimates: true },
  });

  if (!job) notFound();

  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">
        ← Back to jobs
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {job.client.name}
            {job.siteAddress ? ` · ${job.siteAddress}` : ""}
          </p>
        </div>
        <StatusSelect jobId={job.id} status={job.status} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Site visit</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {job.siteVisits.length > 0
              ? `${job.siteVisits.length} recording(s) uploaded.`
              : "Upload your recorded walkthrough here to transcribe it."}
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            Coming next: audio upload + transcription (needs a transcription API key).
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Scope of work</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {job.scopeItems.length > 0
              ? `${job.scopeItems.length} scope item(s) drafted.`
              : "AI drafts a scope from the transcript for you to review and edit."}
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            Coming next: AI scope drafting (needs an Anthropic API key).
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Estimate</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {job.estimates.length > 0
              ? `${job.estimates.length} estimate version(s).`
              : "Priced line items and a branded PDF, ready to send."}
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            Coming next: pricing engine + PDF export.
          </p>
        </section>
      </div>

      <div className="mt-8 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Client details</p>
        <p className="mt-1">{job.client.email ?? "No email on file"}</p>
        <p>{job.client.phone ?? "No phone on file"}</p>
        <p>{job.client.address ?? ""}</p>
      </div>
    </div>
  );
}
