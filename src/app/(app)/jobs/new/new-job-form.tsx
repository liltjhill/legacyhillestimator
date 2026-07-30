"use client";

import { useState } from "react";
import { createJob } from "../actions";

type Client = { id: string; name: string };

export function NewJobForm({ clients }: { clients: Client[] }) {
  const [mode, setMode] = useState<"existing" | "new">(clients.length > 0 ? "existing" : "new");

  return (
    <form action={createJob} className="mt-6 max-w-xl space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Job title</label>
        <input
          name="title"
          required
          placeholder="e.g. Smith Kitchen Remodel"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Site address
        </label>
        <input
          name="siteAddress"
          placeholder="123 Main St, Anytown"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex gap-4 text-sm">
          {clients.length > 0 && (
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="clientMode"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
              />
              Existing client
            </label>
          )}
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="clientMode"
              checked={mode === "new"}
              onChange={() => setMode("new")}
            />
            New client
          </label>
        </div>

        {mode === "existing" ? (
          <select
            name="clientId"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <input
              name="clientName"
              required
              placeholder="Client name"
              className="col-span-2 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="clientEmail"
              type="email"
              placeholder="Email"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="clientPhone"
              placeholder="Phone"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="clientAddress"
              placeholder="Client address (if different from site)"
              className="col-span-2 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Create job
      </button>
    </form>
  );
}
