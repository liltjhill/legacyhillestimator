"use client";

import { useState } from "react";
import { updateSettings } from "./actions";

type Settings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLicenseNo: string;
  defaultMarkupPct: number;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (formData) => {
        await updateSettings(formData);
        setSaved(true);
      }}
      onChange={() => setSaved(false)}
      className="mt-6 max-w-xl space-y-4"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company name
        </label>
        <input
          name="companyName"
          defaultValue={settings.companyName}
          required
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Address</label>
        <input
          name="companyAddress"
          defaultValue={settings.companyAddress}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone</label>
          <input
            name="companyPhone"
            defaultValue={settings.companyPhone}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
          <input
            name="companyEmail"
            type="email"
            defaultValue={settings.companyEmail}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          License #
        </label>
        <input
          name="companyLicenseNo"
          defaultValue={settings.companyLicenseNo}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Default markup %
        </label>
        <input
          name="defaultMarkupPct"
          type="number"
          step="0.1"
          min="0"
          max="100"
          defaultValue={settings.defaultMarkupPct}
          required
          className="w-32 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="text-xs text-zinc-500">
          Applied to material + labor cost on new estimate line items. Adjustable per job.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  );
}
