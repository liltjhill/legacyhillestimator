import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EstimatePdf } from "@/lib/estimate-pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      job: { include: { client: true } },
      lineItems: {
        orderBy: { sortOrder: "asc" },
        include: { scopeItem: true, priceListItem: true },
      },
    },
  });

  if (!estimate) {
    return new NextResponse(null, { status: 404 });
  }

  const settings = await prisma.settings.findFirst();

  const buffer = await renderToBuffer(
    <EstimatePdf
      company={{
        name: settings?.companyName ?? "Your Company Name",
        address: settings?.companyAddress ?? "",
        phone: settings?.companyPhone ?? "",
        email: settings?.companyEmail ?? "",
        licenseNo: settings?.companyLicenseNo ?? "",
      }}
      job={{ title: estimate.job.title, siteAddress: estimate.job.siteAddress }}
      client={{
        name: estimate.job.client.name,
        email: estimate.job.client.email,
        phone: estimate.job.client.phone,
      }}
      estimate={{
        version: estimate.version,
        createdAt: estimate.createdAt,
        materialSubtotal: Number(estimate.materialSubtotal),
        laborSubtotal: Number(estimate.laborSubtotal),
        total: Number(estimate.total),
      }}
      lineItems={estimate.lineItems.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        clientPrice: Number(item.clientPrice),
        aiEstimated: item.aiEstimated,
        costCode: item.scopeItem?.category ?? item.priceListItem?.category ?? null,
      }))}
    />,
  );

  const filename = `estimate-${estimate.job.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-v${estimate.version}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
