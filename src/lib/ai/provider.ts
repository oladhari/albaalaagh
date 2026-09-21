import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AiProviderName = "openai" | "anthropic";
export type AiModelTier = "text" | "fast";
export type AiErrorCategory =
  | "authentication"
  | "billing_or_quota"
  | "rate_limit"
  | "invalid_request"
  | "permission_or_policy"
  | "timeout"
  | "transient_server"
  | "malformed_output"
  | "unknown";

export interface AiOperationContext {
  operation: string;
  route: string;
  modelTier: AiModelTier;
  maxOutputTokens: number;
}

export interface StructuredOutputRequest<T> extends AiOperationContext {
  instructions: string;
  input: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  validate: (value: unknown) => T;
}

export interface TextOutputRequest extends AiOperationContext {
  instructions: string;
  input: unknown;
  validate?: (value: string) => string;
}

export class AiProviderError extends Error {
  constructor(
    public readonly category: AiErrorCategory,
    public readonly status: number,
    public readonly retryCount: number,
    message?: string,
  ) {
    super(message ?? adminMessageForCategory(category));
    this.name = "AiProviderError";
  }
}

interface ProviderClients {
  openai?: Pick<OpenAI, "responses">;
  anthropic?: Pick<Anthropic, "messages">;
}

interface ProviderDependencies {
  env?: Record<string, string | undefined>;
  clients?: ProviderClients;
  sleep?: (milliseconds: number) => Promise<void>;
  logger?: Pick<Console, "info" | "error">;
}

interface ProviderResponse {
  text: string;
  requestId: string | null;
  status: number;
}

const RETRY_DELAYS_MS = [500, 1_500] as const;
const RETRYABLE = new Set<AiErrorCategory>(["rate_limit", "timeout", "transient_server"]);

export function adminMessageForCategory(category: AiErrorCategory): string {
  switch (category) {
    case "authentication": return "تعذّر التحقق من بيانات اعتماد مزوّد الذكاء الاصطناعي.";
    case "billing_or_quota": return "رصيد أو حصة مزوّد الذكاء الاصطناعي غير متاحة حالياً.";
    case "rate_limit": return "مزود الذكاء الاصطناعي مشغول حالياً. حاول بعد قليل.";
    case "invalid_request": return "تعذّر إرسال الطلب إلى مزوّد الذكاء الاصطناعي بسبب إعداد غير صالح.";
    case "permission_or_policy": return "رفض مزوّد الذكاء الاصطناعي معالجة هذا الطلب.";
    case "timeout": return "انتهت مهلة طلب الذكاء الاصطناعي. حاول مجدداً.";
    case "transient_server": return "حدث عطل مؤقت لدى مزوّد الذكاء الاصطناعي. حاول مجدداً.";
    case "malformed_output": return "أعاد مزوّد الذكاء الاصطناعي نتيجة غير صالحة ولم تُحفظ.";
    default: return "تعذّر إكمال طلب الذكاء الاصطناعي.";
  }
}

export function toAdminAiResponse(error: unknown): { error: string; category: AiErrorCategory; status: number } {
  const normalized = error instanceof AiProviderError
    ? error
    : new AiProviderError("unknown", 500, 0);
  return {
    error: adminMessageForCategory(normalized.category),
    category: normalized.category,
    status: normalized.status,
  };
}

export function createAiProvider(dependencies: ProviderDependencies = {}) {
  const env = dependencies.env ?? process.env;
  const provider = parseProvider(env.AI_PROVIDER);
  const logger = dependencies.logger ?? console;
  const sleep = dependencies.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let openai = dependencies.clients?.openai;
  let anthropic = dependencies.clients?.anthropic;

  const getModel = (tier: AiModelTier): string => {
    if (provider === "openai") {
      return tier === "text"
        ? env.OPENAI_TEXT_MODEL || "gpt-5.4-mini"
        : env.OPENAI_FAST_MODEL || "gpt-5-mini";
    }
    return tier === "text"
      ? env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-6"
      : env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";
  };

  const getOpenAI = () => {
    if (!openai) openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 0, timeout: 60_000 });
    return openai;
  };

  const getAnthropic = () => {
    if (!anthropic) anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 60_000 });
    return anthropic;
  };

  async function request(
    requestContext: AiOperationContext,
    instructions: string,
    input: unknown,
    format?: { name: string; schema: Record<string, unknown> },
  ): Promise<ProviderResponse> {
    const model = getModel(requestContext.modelTier);
    let retryCount = 0;

    while (true) {
      const startedAt = Date.now();
      try {
        const response = provider === "openai"
          ? await requestOpenAI(getOpenAI(), model, requestContext.maxOutputTokens, instructions, input, format)
          : await requestAnthropic(getAnthropic(), model, requestContext.maxOutputTokens, instructions, input, format);

        logMetadata(logger, "info", {
          provider, model, operation: requestContext.operation, route: requestContext.route,
          timestamp: new Date().toISOString(), httpStatus: response.status,
          requestId: response.requestId, errorCategory: null, retryCount,
          durationMs: Date.now() - startedAt,
        });
        return response;
      } catch (error) {
        const normalized = normalizeProviderError(error, retryCount);
        const willRetry = RETRYABLE.has(normalized.category) && retryCount < RETRY_DELAYS_MS.length;
        logMetadata(logger, "error", {
          provider, model, operation: requestContext.operation, route: requestContext.route,
          timestamp: new Date().toISOString(), httpStatus: normalized.status,
          requestId: providerRequestId(error), errorCategory: normalized.category,
          retryCount, durationMs: Date.now() - startedAt,
        });
        if (!willRetry) throw normalized;
        await sleep(RETRY_DELAYS_MS[retryCount]);
        retryCount += 1;
      }
    }
  }

  return {
    provider,
    getModel,
    async structured<T>(options: StructuredOutputRequest<T>): Promise<T> {
      const response = await request(options, options.instructions, options.input, {
        name: options.schemaName,
        schema: options.schema,
      });
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.text);
      } catch {
        logMalformedOutput(logger, provider, getModel(options.modelTier), options);
        throw new AiProviderError("malformed_output", 502, 0);
      }
      try {
        return options.validate(parsed);
      } catch {
        logMalformedOutput(logger, provider, getModel(options.modelTier), options);
        throw new AiProviderError("malformed_output", 502, 0);
      }
    },
    async text(options: TextOutputRequest): Promise<string> {
      const response = await request(options, options.instructions, options.input);
      const value = response.text.trim();
      if (!value) throw new AiProviderError("malformed_output", 502, 0);
      try {
        return options.validate ? options.validate(value) : value;
      } catch {
        logMalformedOutput(logger, provider, getModel(options.modelTier), options);
        throw new AiProviderError("malformed_output", 502, 0);
      }
    },
  };
}

export type AiProvider = ReturnType<typeof createAiProvider>;

function parseProvider(value: string | undefined): AiProviderName {
  if (!value || value === "openai") return "openai";
  if (value === "anthropic") return "anthropic";
  throw new AiProviderError("invalid_request", 500, 0, "Unsupported AI_PROVIDER configuration");
}

async function requestOpenAI(
  client: Pick<OpenAI, "responses">,
  model: string,
  maxOutputTokens: number,
  instructions: string,
  input: unknown,
  format?: { name: string; schema: Record<string, unknown> },
): Promise<ProviderResponse> {
  const result = await client.responses.create({
    model,
    instructions,
    input: [{
      role: "user",
      content: [{ type: "input_text", text: JSON.stringify({ untrusted_source_data: input }) }],
    }],
    max_output_tokens: maxOutputTokens,
    store: false,
    ...(format ? {
      text: {
        format: { type: "json_schema" as const, name: format.name, strict: true, schema: format.schema },
      },
    } : {}),
  });

  const refusal = result.output.some((item) =>
    item.type === "message" && item.content.some((content) => content.type === "refusal"),
  );
  if (refusal) throw new AiProviderError("permission_or_policy", 422, 0);
  if (result.status !== "completed" || !result.output_text?.trim()) {
    throw new AiProviderError("malformed_output", 502, 0);
  }
  return { text: result.output_text, requestId: result._request_id ?? null, status: 200 };
}

async function requestAnthropic(
  client: Pick<Anthropic, "messages">,
  model: string,
  maxOutputTokens: number,
  instructions: string,
  input: unknown,
  format?: { name: string; schema: Record<string, unknown> },
): Promise<ProviderResponse> {
  const schemaInstruction = format
    ? `\nReturn JSON only. It must match this JSON Schema exactly:\n${JSON.stringify(format.schema)}`
    : "\nReturn only the requested final text.";
  const result = await client.messages.create({
    model,
    max_tokens: maxOutputTokens,
    system: `${instructions}${schemaInstruction}`,
    messages: [{ role: "user", content: JSON.stringify({ untrusted_source_data: input }) }],
  });
  const text = result.content.find((content) => content.type === "text")?.text?.trim() ?? "";
  if (result.stop_reason === "refusal") throw new AiProviderError("permission_or_policy", 422, 0);
  if (!text) throw new AiProviderError("malformed_output", 502, 0);
  return { text, requestId: result._request_id ?? null, status: 200 };
}

function normalizeProviderError(error: unknown, retryCount: number): AiProviderError {
  if (error instanceof AiProviderError) {
    return new AiProviderError(error.category, error.status, retryCount, error.message);
  }
  const candidate = error as { status?: number; code?: string; type?: string; name?: string };
  const status = typeof candidate?.status === "number" ? candidate.status : 500;
  const code = `${candidate?.code ?? ""} ${candidate?.type ?? ""}`.toLowerCase();
  if (status === 401) return new AiProviderError("authentication", 401, retryCount);
  if (status === 402) return new AiProviderError("billing_or_quota", 402, retryCount);
  if (status === 429 && /(quota|billing|credit|insufficient)/.test(code)) return new AiProviderError("billing_or_quota", 429, retryCount);
  if (status === 429) return new AiProviderError("rate_limit", 429, retryCount);
  if (status === 403) return new AiProviderError("permission_or_policy", 403, retryCount);
  if (status === 400 || status === 404 || status === 409 || status === 422) return new AiProviderError("invalid_request", status, retryCount);
  if (candidate?.name === "APIConnectionTimeoutError" || /(timeout|timed_out)/.test(code)) return new AiProviderError("timeout", 504, retryCount);
  if (status >= 500) return new AiProviderError("transient_server", 503, retryCount);
  return new AiProviderError("unknown", 500, retryCount);
}

function providerRequestId(error: unknown): string | null {
  const value = (error as { requestID?: unknown })?.requestID;
  return typeof value === "string" ? value : null;
}

function logMetadata(
  logger: Pick<Console, "info" | "error">,
  level: "info" | "error",
  metadata: Record<string, unknown>,
) {
  logger[level](JSON.stringify({ event: "ai_provider_request", ...metadata }));
}

function logMalformedOutput(
  logger: Pick<Console, "info" | "error">,
  provider: AiProviderName,
  model: string,
  context: AiOperationContext,
) {
  logMetadata(logger, "error", {
    provider,
    model,
    operation: context.operation,
    route: context.route,
    timestamp: new Date().toISOString(),
    httpStatus: 200,
    requestId: null,
    errorCategory: "malformed_output",
    retryCount: 0,
    durationMs: 0,
  });
}
