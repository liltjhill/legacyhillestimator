import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusSelect } from "./status-select";
import { SiteVisitSection } from "./site-visit-section";
import { ScopeSection } from "./scope-section";
import { EstimateSection } from "./estimate-section";

// Headroom for this page's Server Actions that call the Anthropic API
// synchronously (scope drafting, pricing) - not related to transcription,
// which now runs in its own route with its own maxDuration.
export const maxDuration = 60;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: true,
      siteVisits: { orderBy: { createdAt: "asc" } },
      scopeItems: { orderBy: { sortOrder: "asc" } },
      estimates: {
        orderBy: { version: "desc" },
        take: 1,
        include: { lineItems: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!job) notFound();

  const latestSiteVisit = job.siteVisits[job.siteVisits.length - 1];
  const latestEstimate = job.estimates[0];

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

      <div className="mt-8 space-y-10">
        <SiteVisitSection
          jobId={job.id}
          // TEMPORARY: forcing the server-action upload path (file travels
          // through our own server, which still stores it in Blob via
          // put() server-side) instead of the browser-to-Blob direct
          // client upload. The client-side upload was hanging
          // indefinitely even for a tiny (~1MB) file with no error and no
          // request ever reaching our server, which points at something
          // wrong in the browser-side Blob SDK interaction that isn't
          // diagnosable without direct devtools access. This path is
          // simpler and fully visible in our own server logs. Worth
          // revisiting for very large recordings later.
          blobConfigured={false}
          siteVisits={job.siteVisits.map((v) => ({
            id: v.id,
            audioUrl: v.audioUrl,
            audioFilename: v.audioFilename,
            transcript: v.transcript,
            transcriptionStatus: v.transcriptionStatus,
            transcriptionError: v.transcriptionError,
          }))}
        />

        <ScopeSection
          jobId={job.id}
          scopeItems={job.scopeItems.map((s) => ({
            id: s.id,
            room: s.room,
            description: s.description,
            quantity: s.quantity ? Number(s.quantity) : null,
            unit: s.unit,
            category: s.category,
            aiDrafted: s.aiDrafted,
          }))}
          transcript={latestSiteVisit?.transcript ?? null}
        />

        <EstimateSection
          jobId={job.id}
          scopeItemCount={job.scopeItems.length}
          latestEstimate={
            latestEstimate
              ? {
                  id: latestEstimate.id,
                  version: latestEstimate.version,
                  materialSubtotal: Number(latestEstimate.materialSubtotal),
                  laborSubtotal: Number(latestEstimate.laborSubtotal),
                  total: Number(latestEstimate.total),
                  sentAt: latestEstimate.sentAt,
                  lineItems: latestEstimate.lineItems.map((item) => ({
                    id: item.id,
                    description: item.description,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    materialCost: Number(item.materialCost),
                    laborCost: Number(item.laborCost),
                    markupPct: Number(item.markupPct),
                    clientPrice: Number(item.clientPrice),
                    aiEstimated: item.aiEstimated,
                    aiConfidenceNote: item.aiConfidenceNote,
                  })),
                }
              : null
          }
        />
      </div>

      <div className="mt-10 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Client details</p>
        <p className="mt-1">{job.client.email ?? "No email on file"}</p>
        <p>{job.client.phone ?? "No phone on file"}</p>
        <p>{job.client.address ?? ""}</p>
      </div>
    </div>
  );
}
