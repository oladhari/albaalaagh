# Image API migration — 14 November 2026

The news-card, Facebook-card and writer-cover workflows now share
`IMAGE_MODEL = "gpt-image-2.6-sunburst"` in `src/lib/ai-image.ts`.
OpenAI retires `gpt-image-2` on 10 February 2027.
Sunburst is intended for detailed compositions and image edits:
[model documentation](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst),
[deprecation notice](https://developers.openai.com/api/docs/deprecations).

The existing Images API endpoints, OpenAI key, base64 decoding and storage flow
remain compatible. Quality stays `medium`; news and background requests remain
1280×720, while Facebook requests remain 1024×1024 and are resized to 1080×1080.
Writer photographs never enter the image model: the background is generated,
then the original portrait, Arabic text and article-series badge are composed locally.

Initial live template-edit samples printed the description as well as the title.
Both prompts now explicitly mark the description as visual context only and
repeat the rule to render only the supplied headline after the template instructions. Revised
news and square samples passed visual review. The three final workflow samples
took approximately 27–28 seconds each, including local composition and the
writer planning call where applicable; this is sample evidence, not a latency SLA.

## Validation

Normal `npm test` does not make paid image requests. It tests the three workflow
request/response contracts, reference attachment, square resizing, local writer
composition and missing-image failures. Existing portrait pixel-preservation
and prompt/route tests also remain active.

The optional live check calls the real image API and writer planning workflow,
but replaces R2 storage with local files. It creates no database records or social
posts. It saves images, timings and returned image-token usage for visual and
cost review. Token consumption can vary even at the same quality setting;
consult [current pricing](https://developers.openai.com/api/docs/pricing).

After explicit authorization for a paid test, run from the project root:

```sh
RUN_OPENAI_IMAGE_SMOKE=1 \
IMAGE_SMOKE_OUTPUT_DIR=/mnt/linuxdata/image-api-smoke \
IMAGE_SMOKE_PORTRAIT=/absolute/path/to/original-portrait.png \
npx vitest run smoke/images.live.test.ts
```

This check reads the project's `.env.local` directly so a stale shell key cannot
override it. `IMAGE_SMOKE_ENV_FILE` can select another existing local environment
file. Never print or commit its values. The portrait is sent as a supplied
reference for news/Facebook template edits; writer covers use it locally only.
