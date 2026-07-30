"use client";

import { updateJobStatus } from "../actions";

const STATUSES = ["DRAFT", "SENT", "WON", "LOST"] as const;
const LABEL: Record<(typeof STATUSES)[number], string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  WON: "Won",
  LOST: "Lost",
};

export function StatusSelect({ jobId, status }: { jobId: string; status: string }) {
  return (
    <form
      action={(formData) => updateJobStatus(jobId, formData)}
      onChange={(event) => event.currentTarget.requestSubmit()}
    >
      <select
        name="status"
        defaultValue={status}
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {LABEL[value]}
          </option>
        ))}
      </select>
    </form>
  );
}
