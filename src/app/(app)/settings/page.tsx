import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await prisma.settings.findFirst();

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Company details used on branded PDF estimates, and your default markup.
      </p>

      <SettingsForm
        settings={{
          companyName: settings?.companyName ?? "Your Company Name",
          companyAddress: settings?.companyAddress ?? "",
          companyPhone: settings?.companyPhone ?? "",
          companyEmail: settings?.companyEmail ?? "",
          companyLicenseNo: settings?.companyLicenseNo ?? "",
          defaultMarkupPct: settings ? Number(settings.defaultMarkupPct) : 20,
        }}
      />
    </div>
  );
}
