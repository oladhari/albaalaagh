import OpenAI from "openai";

if (process.env.RUN_OPENAI_SMOKE !== "1") {
  console.error("Refusing paid smoke test. Set RUN_OPENAI_SMOKE=1 only after explicit approval.");
  process.exit(2);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not configured.");
  process.exit(2);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30_000 });
const response = await client.responses.create({
  model: process.env.OPENAI_FAST_MODEL || "gpt-5-mini",
  instructions: "Return exactly the Arabic word: جاهز",
  input: "Connectivity smoke test.",
  max_output_tokens: 20,
  store: false,
});

if (response.output_text.trim() !== "جاهز") {
  console.error("Smoke test returned an unexpected response.");
  process.exit(1);
}

console.log("OpenAI smoke test passed.");
