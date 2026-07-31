"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  uploadSiteVisit,
  uploadSiteVisitFromBlob,
  retryTranscription,
  updateTranscript,
} from "./site-visit-actions";

type SiteVisit = {
  id: string;
  audioUrl: string;
  audioFilename: string | null;
  transcript: string | null;
  transcriptionStatus: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  transcriptionError: string | null;
};

const STATUS_LABEL: Record<SiteVisit["transcriptionStatus"], string> = {
  PENDING: "Pending",
  PROCESSING: "Transcribing…",
  COMPLETE: "Transcribed",
  FAILED: "Transcription failed",
};

/**
 * Fires the transcription request and deliberately does not await it - the
 * browser keeps this request alive independently of our component's
 * lifecycle, so it isn't bound by how long the upload/retry action itself
 * took. Progress shows up via the polling in SiteVisitSection, not this
 * call's response.
 */
function triggerTranscription(siteVisitId: string) {
  fetch(`/api/site-visit/${siteVisitId}/transcribe`, { method: "POST", keepalive: true }).catch(
    () => {
      // Ignored: if this fetch itself fails to even go out, the row stays
      // PROCESSING and the user can hit Retry, which fires it again.
    },
  );
}

export function SiteVisitSection({
  jobId,
  siteVisits,
  blobConfigured,
}: {
  jobId: string;
  siteVisits: SiteVisit[];
  blobConfigured: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUploading] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const latest = siteVisits[siteVisits.length - 1];
  const router = useRouter();

  const anyProcessing = siteVisits.some(
    (v) => v.transcriptionStatus === "PENDING" || v.transcriptionStatus === "PROCESSING",
  );

  useEffect(() => {
    if (!anyProcessing) return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [anyProcessing, router]);

  function handleUploadClick() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose an audio file to upload.");
      return;
    }

    setUploadError(null);
    startUploading(async () => {
      try {
        let siteVisitId: string;
        if (blobConfigured) {
          const blob = await upload(`${jobId}/${crypto.randomUUID()}-${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/site-visit/blob-upload",
          });
          siteVisitId = await uploadSiteVisitFromBlob(jobId, blob.url, file.name);
        } else {
          const formData = new FormData();
          formData.set("audio", file);
          siteVisitId = await uploadSiteVisit(jobId, formData);
        }
        triggerTranscription(siteVisitId);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed.");
      }
    });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Site visit</h2>

      <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
        <input ref={fileInputRef} type="file" accept="audio/*" required className="text-sm" />
        <button
          type="button"
          disabled={isUploading}
          onClick={handleUploadClick}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isUploading ? "Uploading & transcribing…" : "Upload recording"}
        </button>
      </div>
      {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}

      {siteVisits.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No recordings uploaded yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {siteVisits.map((visit) => (
            <SiteVisitCard key={visit.id} jobId={jobId} visit={visit} />
          ))}
        </div>
      )}

      {latest?.transcript && (
        <p className="mt-2 text-xs text-zinc-400">
          Head to Scope of work below and click &quot;Draft from transcript&quot;.
        </p>
      )}
    </div>
  );
}

function SiteVisitCard({ jobId, visit }: { jobId: string; visit: SiteVisit }) {
  const [isRetrying, startRetrying] = useTransition();
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {visit.audioFilename ?? "Recording"}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              visit.transcriptionStatus === "COMPLETE"
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : visit.transcriptionStatus === "FAILED"
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {STATUS_LABEL[visit.transcriptionStatus]}
          </span>
          {visit.transcriptionStatus !== "COMPLETE" && (
            <button
              disabled={isRetrying}
              onClick={() =>
                startRetrying(async () => {
                  const siteVisitId = await retryTranscription(jobId, visit.id);
                  triggerTranscription(siteVisitId);
                })
              }
              className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
              title={
                visit.transcriptionStatus === "PROCESSING"
                  ? "Stuck? This restarts the transcription."
                  : undefined
              }
            >
              {isRetrying ? "Retrying…" : "Retry"}
            </button>
          )}
        </div>
      </div>

      {visit.transcriptionStatus === "FAILED" && visit.transcriptionError && (
        <p className="mt-1 text-xs text-red-600">{visit.transcriptionError}</p>
      )}

      <audio controls src={visit.audioUrl} className="mt-2 w-full" />

      {visit.transcriptionStatus !== "PROCESSING" && (
        <div className="mt-2">
          {isEditingTranscript ? (
            <form
              action={async (formData) => {
                await updateTranscript(visit.id, formData);
                setIsEditingTranscript(false);
              }}
            >
              <textarea
                name="transcript"
                defaultValue={visit.transcript ?? ""}
                rows={6}
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="mt-1 flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTranscript(false)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                {visit.transcript || "No transcript yet — click Edit to add one manually."}
              </p>
              <button
                onClick={() => setIsEditingTranscript(true)}
                className="mt-1 text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                Edit transcript
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
