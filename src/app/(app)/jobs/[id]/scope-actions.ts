"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { getAnthropicClient, SCOPE_DRAFTING_MODEL } from "@/lib/anthropic";

const ScopeItemSchema = z.object({
  room: z.string().trim().min(1, "Room/area is required"),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

const DRAFT_SCOPE_TOOL = {
  name: "record_scope_items",
  description: "Record the structured scope-of-work items extracted from a site visit transcript.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            room: {
              type: "string",
              description: "Room or area of the house, e.g. 'Kitchen', 'Primary Bath'.",
            },
            description: {
              type: "string",
              description: "A single concrete scope-of-work task or material item.",
            },
            quantity: {
              type: "number",
              description: "Numeric quantity if mentioned or reasonably inferable, otherwise omit.",
            },
            unit: {
              type: "string",
              description: "Unit for the quantity, e.g. 'sq ft', 'each', 'linear ft'.",
            },
            category: {
              type: "string",
              description: "Trade/category, e.g. 'Plumbing', 'Flooring', 'Electrical', 'Demo'.",
            },
          },
          required: ["room", "description"],
        },
      },
    },
    required: ["items"],
  },
};

export async function draftScopeFromTranscript(jobId: string, transcript: string) {
  await verifySession();

  if (!transcript.trim()) {
    throw new Error("There's no transcript to draft a scope from yet.");
  }

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: SCOPE_DRAFTING_MODEL,
    max_tokens: 4096,
    system:
      "You are a remodeling estimator's assistant. Extract every discrete, biddable scope-of-work " +
      "item from a contractor's spoken site-visit walkthrough transcript. Break work into concrete " +
      "line items a contractor could price individually (e.g. 'Remove and replace kitchen sink base " +
      "cabinet' rather than 'redo kitchen'). Only include work actually mentioned or clearly implied " +
      "by the transcript. Use the record_scope_items tool to report your results.",
    messages: [{ role: "user", content: `Transcript:\n\n${transcript}` }],
    tools: [DRAFT_SCOPE_TOOL],
    tool_choice: { type: "tool", name: "record_scope_items" },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("The AI didn't return structured scope items. Try again.");
  }

  const parsed = z.object({ items: z.array(ScopeItemSchema) }).parse(toolUse.input);

  if (parsed.items.length === 0) {
    throw new Error("The AI didn't find any scope items in the transcript.");
  }

  await prisma.$transaction(async (tx) => {
    // Regenerating replaces the previous AI draft rather than piling a new
    // batch on top of it - only items added/edited by hand (aiDrafted:
    // false) survive. Any priced line items pointing at the old drafted
    // items are unlinked first so the delete doesn't hit the FK guard.
    const staleDrafted = await tx.scopeItem.findMany({
      where: { jobId, aiDrafted: true },
      select: { id: true },
    });
    const staleIds = staleDrafted.map((s) => s.id);

    if (staleIds.length > 0) {
      await tx.estimateLineItem.updateMany({
        where: { scopeItemId: { in: staleIds } },
        data: { scopeItemId: null },
      });
      await tx.scopeItem.deleteMany({ where: { id: { in: staleIds } } });
    }

    const existingCount = await tx.scopeItem.count({ where: { jobId } });

    await tx.scopeItem.createMany({
      data: parsed.items.map((item, index) => ({
        jobId,
        room: item.room,
        description: item.description,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category: item.category ?? null,
        aiDrafted: true,
        sortOrder: existingCount + index,
      })),
    });
  });

  revalidatePath(`/jobs/${jobId}`);
}

const ManualScopeItemSchema = z.object({
  room: z.string().trim().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export async function createScopeItem(jobId: string, formData: FormData) {
  await verifySession();

  const parsed = ManualScopeItemSchema.parse({
    room: formData.get("room") || undefined,
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    unit: formData.get("unit") || undefined,
    category: formData.get("category") || undefined,
  });

  const existingCount = await prisma.scopeItem.count({ where: { jobId } });

  await prisma.scopeItem.create({
    data: {
      jobId,
      room: parsed.room || null,
      description: parsed.description,
      quantity: parsed.quantity ?? null,
      unit: parsed.unit || null,
      category: parsed.category || null,
      sortOrder: existingCount,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateScopeItem(id: string, jobId: string, formData: FormData) {
  await verifySession();

  const parsed = ManualScopeItemSchema.parse({
    room: formData.get("room") || undefined,
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    unit: formData.get("unit") || undefined,
    category: formData.get("category") || undefined,
  });

  await prisma.scopeItem.update({
    where: { id },
    data: {
      room: parsed.room || null,
      description: parsed.description,
      quantity: parsed.quantity ?? null,
      unit: parsed.unit || null,
      category: parsed.category || null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteScopeItem(id: string, jobId: string) {
  await verifySession();
  await prisma.scopeItem.delete({ where: { id } });
  revalidatePath(`/jobs/${jobId}`);
}
