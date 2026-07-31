"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { getAnthropicClient, COST_ESTIMATION_MODEL } from "@/lib/anthropic";

const PRICE_SCOPE_TOOL = {
  name: "price_scope_items",
  description:
    "Report a price for each scope item: either a match to an existing price list catalog item, " +
    "or an AI-estimated material and labor cost when no good catalog match exists.",
  input_schema: {
    type: "object" as const,
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            scopeItemId: { type: "string" },
            matchedPriceListItemId: {
              type: ["string", "null"],
              description:
                "The id of a price list catalog item that is a genuinely good match for this " +
                "scope item's task/material, or null if there is no confident match.",
            },
            aiMaterialCost: {
              type: ["number", "null"],
              description:
                "Only when matchedPriceListItemId is null: your best-estimate unit material cost " +
                "in USD for this scope item's unit, based on typical US remodeling costs.",
            },
            aiLaborCost: {
              type: ["number", "null"],
              description:
                "Only when matchedPriceListItemId is null: your best-estimate unit labor cost in " +
                "USD for this scope item's unit.",
            },
            aiConfidenceNote: {
              type: ["string", "null"],
              description:
                "Only when matchedPriceListItemId is null: one sentence noting this is an AI " +
                "estimate that should be verified, plus any key assumption you made.",
            },
          },
          required: ["scopeItemId", "matchedPriceListItemId"],
        },
      },
    },
    required: ["results"],
  },
};

const PriceResultSchema = z.object({
  scopeItemId: z.string(),
  matchedPriceListItemId: z.string().nullable(),
  aiMaterialCost: z.coerce.number().nullable().optional(),
  aiLaborCost: z.coerce.number().nullable().optional(),
  aiConfidenceNote: z.string().nullable().optional(),
});

export async function generateEstimate(jobId: string) {
  await verifySession();

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { scopeItems: true },
  });

  if (job.scopeItems.length === 0) {
    throw new Error("Add scope items before generating an estimate.");
  }

  const priceList = await prisma.priceListItem.findMany();
  const settings = await prisma.settings.findFirst();
  const markupPct = job.markupPct ? Number(job.markupPct) : Number(settings?.defaultMarkupPct ?? 20);

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: COST_ESTIMATION_MODEL,
    max_tokens: 4096,
    system:
      "You are a remodeling estimator's pricing assistant. You are given a contractor's price list " +
      "catalog and a job's scope-of-work items. For each scope item, decide whether an existing " +
      "catalog item is a genuinely good match (same task or material) - only match when confident. " +
      "Otherwise provide your own realistic unit cost estimate for typical US remodeling costs. " +
      "Use the price_scope_items tool to report every scope item exactly once.",
    messages: [
      {
        role: "user",
        content:
          `Price list catalog:\n${JSON.stringify(
            priceList.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              unit: p.unit,
              materialCost: Number(p.materialCost),
              laborCost: Number(p.laborCost),
            })),
          )}\n\n` +
          `Scope items to price:\n${JSON.stringify(
            job.scopeItems.map((s) => ({
              id: s.id,
              room: s.room,
              description: s.description,
              quantity: s.quantity ? Number(s.quantity) : null,
              unit: s.unit,
              category: s.category,
            })),
          )}`,
      },
    ],
    tools: [PRICE_SCOPE_TOOL],
    tool_choice: { type: "tool", name: "price_scope_items" },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("The AI didn't return structured pricing. Try again.");
  }

  const parsed = z.object({ results: z.array(PriceResultSchema) }).parse(toolUse.input);
  const resultByScopeId = new Map(parsed.results.map((r) => [r.scopeItemId, r]));
  const priceListById = new Map(priceList.map((p) => [p.id, p]));

  let materialSubtotal = 0;
  let laborSubtotal = 0;
  let total = 0;

  const lineItemsData = job.scopeItems.map((scopeItem, index) => {
    const result = resultByScopeId.get(scopeItem.id);
    const quantity = scopeItem.quantity ? Number(scopeItem.quantity) : 1;

    let materialCost: number;
    let laborCost: number;
    let aiEstimated = false;
    let aiConfidenceNote: string | null = null;
    let priceListItemId: string | null = null;

    const matched = result?.matchedPriceListItemId
      ? priceListById.get(result.matchedPriceListItemId)
      : undefined;

    if (matched) {
      materialCost = Number(matched.materialCost);
      laborCost = Number(matched.laborCost);
      priceListItemId = matched.id;
    } else {
      materialCost = result?.aiMaterialCost ?? 0;
      laborCost = result?.aiLaborCost ?? 0;
      aiEstimated = true;
      aiConfidenceNote = result?.aiConfidenceNote ?? "AI-estimated cost - please verify.";
    }

    const lineTotal = (materialCost + laborCost) * quantity;
    const clientPrice = lineTotal * (1 + markupPct / 100);

    materialSubtotal += materialCost * quantity;
    laborSubtotal += laborCost * quantity;
    total += clientPrice;

    return {
      description: scopeItem.room ? `${scopeItem.room}: ${scopeItem.description}` : scopeItem.description,
      quantity,
      unit: scopeItem.unit,
      materialCost,
      laborCost,
      markupPct,
      clientPrice,
      aiEstimated,
      aiConfidenceNote,
      sortOrder: index,
      scopeItemId: scopeItem.id,
      priceListItemId,
    };
  });

  const previousVersion = await prisma.estimate.findFirst({
    where: { jobId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const estimate = await prisma.estimate.create({
    data: {
      jobId,
      version: (previousVersion?.version ?? 0) + 1,
      materialSubtotal,
      laborSubtotal,
      markupPct,
      total,
      lineItems: { create: lineItemsData },
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return estimate.id;
}

const LineItemUpdateSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().min(0),
  unit: z.string().trim().optional(),
  materialCost: z.coerce.number().min(0),
  laborCost: z.coerce.number().min(0),
  markupPct: z.coerce.number().min(0),
});

async function recomputeEstimateTotals(estimateId: string) {
  const lineItems = await prisma.estimateLineItem.findMany({ where: { estimateId } });

  let materialSubtotal = 0;
  let laborSubtotal = 0;
  let total = 0;
  for (const item of lineItems) {
    const quantity = Number(item.quantity);
    materialSubtotal += Number(item.materialCost) * quantity;
    laborSubtotal += Number(item.laborCost) * quantity;
    total += Number(item.clientPrice);
  }

  await prisma.estimate.update({
    where: { id: estimateId },
    data: { materialSubtotal, laborSubtotal, total },
  });
}

export async function updateEstimateLineItem(
  id: string,
  estimateId: string,
  jobId: string,
  formData: FormData,
) {
  await verifySession();

  const parsed = LineItemUpdateSchema.parse({
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit") || undefined,
    materialCost: formData.get("materialCost"),
    laborCost: formData.get("laborCost"),
    markupPct: formData.get("markupPct"),
  });

  const clientPrice =
    (parsed.materialCost + parsed.laborCost) * parsed.quantity * (1 + parsed.markupPct / 100);

  await prisma.estimateLineItem.update({
    where: { id },
    data: {
      description: parsed.description,
      quantity: parsed.quantity,
      unit: parsed.unit || null,
      materialCost: parsed.materialCost,
      laborCost: parsed.laborCost,
      markupPct: parsed.markupPct,
      clientPrice,
      aiEstimated: false,
      aiConfidenceNote: null,
    },
  });

  await recomputeEstimateTotals(estimateId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteEstimateLineItem(id: string, estimateId: string, jobId: string) {
  await verifySession();
  await prisma.estimateLineItem.delete({ where: { id } });
  await recomputeEstimateTotals(estimateId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function markEstimateSent(estimateId: string, jobId: string) {
  await verifySession();
  await prisma.estimate.update({ where: { id: estimateId }, data: { sentAt: new Date() } });
  await prisma.job.update({ where: { id: jobId }, data: { status: "SENT" } });
  revalidatePath(`/jobs/${jobId}`);
}
