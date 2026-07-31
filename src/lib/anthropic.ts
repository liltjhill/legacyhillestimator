import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

export function getAnthropicClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const SCOPE_DRAFTING_MODEL = "claude-sonnet-5";
export const COST_ESTIMATION_MODEL = "claude-sonnet-5";
