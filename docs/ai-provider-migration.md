# AI provider migration: Anthropic to OpenAI

This document records the pre-migration audit, the implemented provider boundary, and the deployment procedure. No production environment, production database, or deployment was changed as part of this work.

## Pre-migration integration audit

Line numbers below are the locations observed before editing. Every active integration used a direct Anthropic SDK call, had SDK-default retry behavior, and logged or returned raw error objects/messages. JSON operations extracted JSON or XML-like tags from free-form text without schema enforcement.

| Original file and line | Function / route | Original model | Input | Expected output | Database effect | Trigger and review | Original failure behavior | Status |
|---|---|---|---|---|---|---|---|---|
| `src/app/api/cron/fetch-news/route.ts:70` | `classifyBatch`; `GET /api/cron/fetch-news` | `claude-haiku-4-5-20251001` | RSS titles and publisher names | Ordered `{geo, category}[]` | Inserts new `news` rows with `status: pending`; deletes stale pending rows older than 48 hours | Scheduled cron or authenticated/manual cron invocation; admin review follows | Any AI/parse error fell back to keyword rules; malformed short arrays were padded | Active |
| `src/app/api/admin/news/[id]/generate/route.ts:135` | `POST /api/admin/news/[id]/generate` | `claude-sonnet-4-6` | Existing pending news row | `{title, excerpt, content}` plus existing metadata and citation | No write; returned editable preview | Admin-triggered; separate publish button/action follows | Raw error text returned with HTTP 500 | Active |
| `src/app/api/admin/news/from-url/route.ts:116` | `POST /api/admin/news/from-url` | `claude-sonnet-4-6` | Fetched page title, description, URL, and extracted paragraphs | Tagged title/excerpt/content | Inserted a `pending` placeholder row even when generation failed | Admin-triggered; editable preview and separate publish action follow | Logged raw error, then continued with empty content fallback | Active |
| `src/app/api/admin/news/reclassify/route.ts:53` | `POST /api/admin/news/reclassify` | `claude-haiku-4-5-20251001` | Up to 200 Tunisia-tagged news titles filtered to likely mismatches | Ordered `{geo}[]` | Updates `news.geo` only | Admin-triggered; does not publish | Raw error text returned with HTTP 500 | Active |
| `src/app/api/admin/guests/import/route.ts:38` | `extractGuestsFromBatch`; `POST /api/admin/guests/import` | `claude-haiku-4-5-20251001` | YouTube video titles and descriptions in batches of 10 | Per-video guest arrays | Inserts guests; may update a longer guest title | Admin-triggered; resulting guest records are managed in admin | AI/parse errors silently became an empty batch; outer handler returned raw errors | Active |
| `src/app/api/admin/guests/review/route.ts:96` | `POST /api/admin/guests/review` | `claude-sonnet-4-6` | Guest records plus complete name list | Updates, duplicates, and uncertain suggestions | No write; suggestions are shown for admin review/application | Admin-triggered; manual review and apply step follow | Raw error text returned with HTTP 500 | Active |
| `src/lib/ai-image.ts:1071` | `buildWriterArticlePrompt`; reached through `POST /api/admin/images/generate` | `claude-sonnet-4-6` | Article title/excerpt, writer name, photo-presence flag | Plain image-generation prompt | No database write; generated image is uploaded to R2 by the existing image flow | Admin-triggered from writer article create/edit UI | Raw provider/image error was returned to admin | Active |
| `src/lib/ai-image.ts:409` | `buildImagePrompt` | `claude-sonnet-4-6` | News title and excerpt | Plain image-generation prompt | None | No caller found | Would throw on empty output | Unused legacy helper |

No other active Anthropic import, SDK call, credential reference, retry loop, or model name was found outside these integrations and the dependency/configuration files. Existing OpenAI image generation (`gpt-image-2`) was already active and was not migrated because it was not an Anthropic call.

## Implemented architecture

- `src/lib/ai/provider.ts` is the provider boundary. `AI_PROVIDER=openai` uses the official OpenAI JavaScript SDK and `client.responses.create`; `AI_PROVIDER=anthropic` is an explicit rollback path. There is no automatic fallback.
- OpenAI requests set `store: false`, define no tools, and keep trusted instructions in `instructions`. Source material is serialized under `untrusted_source_data` in the lower-authority input message.
- `src/lib/ai/workflows.ts` owns operation prompts, strict JSON Schemas, and application validation.
- Structured output is used for drafting, URL import, RSS classification, reclassification, guest extraction, and guest review. Writer image prompting uses validated plain text.
- Provider retries are disabled in both SDK clients. The application retries only rate limits, timeouts, and transient server failures, with delays of 500 ms and 1,500 ms. Authentication, quota/billing, invalid request, permission/policy, refusal, and malformed output errors are not retried.
- Logs contain provider, model, operation, route, timestamp, HTTP status, request ID, category, retry count, and duration. They do not contain credentials, source text, prompts, drafts, or raw provider responses.

## Models and tradeoff

Defaults are configuration values, not hard-coded routing requirements:

- `OPENAI_TEXT_MODEL=gpt-5.4-mini` for drafting, URL import, guest review, and writer-image prompting. OpenAI describes it as a faster, efficient high-volume model; it supports the Responses API and Structured Outputs. The published price at audit time was $0.75 per million input tokens and $4.50 per million output tokens.
- `OPENAI_FAST_MODEL=gpt-5-mini` for classification, reclassification, and guest metadata extraction. Its published price at audit time was $0.25 per million input tokens and $2.00 per million output tokens. It supports the Responses API and Structured Outputs.

`gpt-6-astra` is the current highest-capability general model in OpenAI's model guidance, but it was not chosen as the default here because these bounded editorial and classification tasks benefit more from the mini models' lower cost and latency. Change either environment variable after representative evaluation if quality requires it.

Official references:

- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/models/gpt-5-mini
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/text

## Editorial workflow guarantees

- RSS imports remain `pending`.
- URL import generates and validates the full draft before inserting a `pending` placeholder. AI failure causes no insert.
- Existing-news generation performs no database write and returns an editable admin preview.
- Sensitive political, election, conflict, armed-group, detention, torture, terrorism, and disputed-allegation drafts receive an ephemeral `needs_internal_review` flag shown in the admin preview. No database schema change was made.
- Publication remains `POST /api/admin/news/[id]/publish`, protected by `requireAdmin()`. That separate route alone turns the row into an Albaalaagh article with `status: approved` and triggers social sharing.
- Structured and application validation complete before reclassification or guest import writes begin. Malformed model output is rejected.

The existing generic admin status action can still manually approve a raw RSS item, as it could before this migration. That is a human admin action and not an AI action.

## Verification

Normal tests are fully mocked and spend no API credits. The required passing checks are:

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm run lint` remains useful, but at migration time the repository-wide command has a pre-existing backlog of unrelated errors. The newly added provider, workflow, and test files have no lint findings.

The test suite covers Arabic/Unicode output, response compatibility, classification, reclassification, URL drafting, guest extraction/review, writer prompt generation, prompt injection boundaries, political/conflict treatment, refusal, authentication, quota, rate limit retries, invalid requests, permission/policy errors, malformed output, pending status, separate publication, and non-overwrite guarantees.

The paid smoke test is opt-in and must not be run without explicit approval:

```bash
RUN_OPENAI_SMOKE=1 npm run test:ai:smoke
```

## Deployment procedure (not executed)

1. Create a restricted OpenAI project API key and configure it only in the deployment platform's secret manager as `OPENAI_API_KEY`.
2. Configure `AI_PROVIDER=openai`, `OPENAI_TEXT_MODEL=gpt-5.4-mini`, and `OPENAI_FAST_MODEL=gpt-5-mini` in the deployment environment.
3. Leave Anthropic rollback variables in the secret manager only if rollback is desired. Do not set `AI_PROVIDER=anthropic` during the OpenAI rollout.
4. With explicit approval, run the single paid smoke test in a non-production environment.
5. Deploy to a preview/staging environment and manually verify: RSS creates pending rows, generation opens an editable preview, closing the preview does not publish, and the explicit publish button is required.
6. Review sanitized logs for model, operation, request ID, status, category, retries, and duration.
7. After approval, deploy the same build and variables to production. Roll back only by explicitly setting `AI_PROVIDER=anthropic` with valid rollback credentials; the application never switches providers automatically.
