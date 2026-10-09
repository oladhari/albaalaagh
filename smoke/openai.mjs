import OpenAI from "openai";

if (process.env.RUN_OPENAI_SMOKE !== "1") {
  console.error("Refusing paid smoke test. Set RUN_OPENAI_SMOKE=1 only after explicit approval.");
  process.exit(2);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not configured.");
  process.exit(2);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 60_000 });

// The cap includes reasoning tokens, so 20 tokens can end before visible output.
try {
  for (const [tier, model] of [
    ["fast", process.env.OPENAI_FAST_MODEL || "gpt-5-mini"],
    ["text", process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini"],
  ]) {
    const response = await client.responses.create({
      model,
      instructions: "Return a JSON object with ready set to true. This is a connectivity test.",
      input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify({ untrusted_source_data: "اختبار اتصال" }) }] }],
      max_output_tokens: 512,
      reasoning: { effort: "low" },
      store: false,
      text: { format: {
        type: "json_schema", name: "connectivity", strict: true,
        schema: { type: "object", additionalProperties: false, required: ["ready"], properties: { ready: { type: "boolean" } } },
      } },
    });
    if (response.status !== "completed" || JSON.parse(response.output_text).ready !== true) {
      console.error(`OpenAI ${tier} smoke test returned an invalid or incomplete response.`);
      process.exit(1);
    }
    console.log(`OpenAI ${tier} structured-output smoke test passed (${model}).`);
  }
} catch (error) {
  // Do not print SDK error objects, headers, source data, or credentials.
  console.error("OpenAI smoke test failed.", { status: error?.status ?? null });
  process.exit(1);
}
