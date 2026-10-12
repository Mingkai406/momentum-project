const { randomBytes } = require("node:crypto");
const { z } = require("zod");
const item = z
  .object({
    text: z.string().trim().min(1).max(1200),
    sources: z.array(z.string().max(80)).min(1).max(12),
  })
  .strict();
const resultSchema = z
  .object({
    summary: z.array(item).min(1).max(8),
    followups: z.array(item).max(8),
    draft: z.string().trim().min(1).max(4000),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative().nullable(),
        output_tokens: z.number().int().nonnegative().nullable(),
        model_calls: z.number().int().nonnegative().max(6),
        tool_calls: z.number().int().nonnegative().max(8),
        estimated_cost_usd: z.number().nonnegative().nullable(),
        model: z.string().max(150),
      })
      .strict(),
  })
  .strict();
function validateResult(result, context) {
  const parsed = resultSchema.parse(result);
  const known = new Set(context.records.map((r) => r.id));
  for (const row of [...parsed.summary, ...parsed.followups]) {
    if (row.sources.some((ref) => !known.has(ref)))
      throw new Error("Invalid source reference");
  }
  return parsed;
}
function createFollowupProvider(env = process.env) {
  if (!env.FOLLOWUP_AGENT_URL) return null;
  const url = new URL(env.FOLLOWUP_AGENT_URL);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  )
    throw new Error("Agent service requires HTTPS except on loopback");
  if (!env.FOLLOWUP_AGENT_TOKEN || env.FOLLOWUP_AGENT_TOKEN.length < 32)
    throw new Error("FOLLOWUP_AGENT_TOKEN must have at least 32 characters");
  return async ({ context, traceId, signal }) => {
    const response = await fetch(new URL("/draft", url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FOLLOWUP_AGENT_TOKEN}`,
        traceparent: `00-${traceId}-${randomBytes(8).toString("hex")}-01`,
      },
      body: JSON.stringify({ context }),
      redirect: "error",
      signal,
    });
    if (!response.ok) throw new Error("Agent service unavailable");
    // Bound upstream output before parsing, including chunked responses.
    let output = "";
    const reader = response.body.getReader();
    try {
      let size = 0;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 32768) throw new Error("Agent response too large");
        output += decoder.decode(value, { stream: true });
      }
      output += decoder.decode();
      return JSON.parse(output);
    } finally {
      await reader.cancel();
    }
  };
}
module.exports = { createFollowupProvider, validateResult };
