import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { uploadToR2 } from "@/lib/r2";
import { generateWriterImagePrompt } from "@/lib/ai/workflows";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 120_000 });
  return openai;
}

export const LEGACY_NEWS_IMAGE_PROMPT = `You are the official image prompt generator for Albaalaagh (قناة البلاغ).

Your task is NOT to generate images.

Your task is to generate a detailed image-generation prompt for an image generation API.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always output a single ready-to-use image prompt.

Do not explain.

Do not summarize.

Do not add notes.

Do not add markdown.

Return only the final image prompt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE SIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALWAYS generate:

1280px × 720px

Landscape orientation only.

Never generate:

* Square
* Portrait
* Vertical
* 1:1
* 4:5
* 9:16

This is a strict rule.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use Albaalaagh editorial style:

* Premium news article card
* Documentary journalism aesthetic
* Investigative reporting atmosphere
* High contrast
* Cinematic lighting
* Professional newsroom quality
* Serious political and current-affairs design
* Mobile-friendly readability

The image must look like:

* International news magazine cover
* Documentary journalism visual
* Premium editorial newspaper graphic

Never look like:

* YouTube clickbait
* Meme
* Cartoon
* AI fantasy artwork
* Gaming thumbnail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALBAALAAGH BRANDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THE OFFICIAL ALBAALAAGH TEMPLATE IS ATTACHED.

The template already contains:
* The feather logo
* "قناة البلاغ" text
* "ALBAALAAGH" branding
* The official border and frame design

DO NOT describe or reinvent the logo in your prompt.

DO NOT add any branding instructions — the template handles this exactly.

Your prompt must describe ONLY:
* The thematic visual content and scene
* The headline text layout
* The background imagery
* The color mood and lighting
* The editorial composition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEXT ON IMAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use ONLY the supplied headline.

No summaries.

No paragraphs.

No article excerpts.

No dates.

No hashtags.

No website URLs.

Maximum:

2 to 5 short lines.

Large Arabic typography.

Strong mobile readability.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REAL PEOPLE POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULE.

If a real person's image is provided:

Use ONLY the provided image.

Do not modify facial features.

Do not beautify.

Do not age.

Do not rejuvenate.

Do not change ethnicity.

Do not generate an alternative version.

Do not create another face.

Preserve identity exactly.

Examples:

* politicians
* journalists
* writers
* activists
* academics
* public figures

If no authentic image is provided:

DO NOT invent the person's face.

DO NOT create an AI-generated face.

Instead use:

* silhouette
* symbolic figure
* office
* parliament
* courthouse
* ministry
* airport
* hospital
* relevant thematic visuals

When uncertain:

Never generate a face.

Use symbolism.

This rule is mandatory.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COURT CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* courthouse
* scales of justice
* legal documents
* judicial files
* courtroom atmosphere

Avoid:

* prison cages
* handcuffs
* guilty symbolism
* humiliating imagery

If the article concerns detention:

use symbolic prison atmosphere only.

Never depict guilt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLITICAL NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* parliament
* presidential palace
* official documents
* strategic maps
* diplomatic meetings
* political symbolism

Avoid propaganda.

Avoid party glorification.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* police vehicles
* checkpoints
* security operations
* confiscated items
* official field operations

Avoid:

* violence
* beatings
* arrests in progress
* excessive weapons

Focus on operation, not punishment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCIDENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* accident scene
* emergency response
* ambulance
* damaged vehicle
* road safety symbolism

Avoid:

* corpses
* blood
* graphic injuries
* human suffering closeups

Respect victims.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HUMANITARIAN NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* hospitals
* aid
* humanitarian support
* civilians
* social services

Avoid suffering exploitation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MIGRATION NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* boats
* coastlines
* humanitarian symbolism
* migration routes

Avoid:

* humiliating portrayals
* injured migrants
* sensationalism

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ECONOMIC NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* ministry buildings
* economy charts
* stock market symbolism
* industrial infrastructure
* ports
* energy facilities

If a minister is mentioned but no image is provided:

DO NOT generate the minister.

Use symbolic visuals only.

This is mandatory.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERNATIONAL RELATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* flags
* negotiation tables
* diplomatic buildings
* strategic maps
* official documents

Avoid:

* fake meetings
* invented politicians
* invented faces

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILITARY NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

* maps
* ships
* aircraft silhouettes
* radar screens
* strategic command imagery

Avoid:

* gore
* dead bodies
* graphic destruction

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARTICLE CARD COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Standard layout (the template frame is fixed — describe only the content inside it):

Left side:
Headline text (large Arabic typography)

Right side or center:
Main thematic visual

Clean composition.

Strong contrast.

Professional editorial balance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL STYLE REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always end the generated image prompt internally with:

cinematic documentary style,
premium editorial journalism,
high contrast,
professional newspaper aesthetic,
serious news reporting atmosphere,
clean composition,
mobile readability,
1280×720 landscape format.`;

const NEWS_16_9_TEMPLATE_PATH = path.join(process.cwd(), "public", "news_announcement_16_9.png");

// ── Reference people ──────────────────────────────────────────────────────────
// When a news/article subject has a known real photo (from the guests DB or a
// manually supplied one), we attach it as an extra input image and instruct the
// model to preserve that exact identity instead of falling back to "no faces".

export interface PersonPhoto {
  name: string;
  url: string;
}

interface FetchedPersonFiles {
  files: Awaited<ReturnType<typeof toFile>>[];
  attached: PersonPhoto[];
  failed: PersonPhoto[];
}

// Returns only the people whose photo was actually downloaded successfully
// (`attached`), separate from the full requested list. Callers MUST build
// their prompt from `attached`, not the original list — telling the model a
// reference photo is attached when the fetch actually failed (e.g. a broken
// or hotlink-protected manual URL) causes it to silently fall back to a
// symbolic/no-face image with no visible error anywhere.
async function fetchPersonFiles(people: PersonPhoto[]): Promise<FetchedPersonFiles> {
  const files: Awaited<ReturnType<typeof toFile>>[] = [];
  const attached: PersonPhoto[] = [];
  const failed: PersonPhoto[] = [];
  for (const p of people) {
    try {
      const res = await fetch(p.url);
      if (!res.ok) {
        console.warn(JSON.stringify({ event: "ai_image_reference_fetch_failed", status: res.status }));
        failed.push(p);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") ?? "image/png";
      console.info(JSON.stringify({ event: "ai_image_reference_attached", contentType, bytes: buf.length }));
      files.push(await toFile(buf, `person-${files.length}.png`, { type: contentType }));
      attached.push(p);
    } catch {
      console.warn(JSON.stringify({ event: "ai_image_reference_fetch_failed" }));
      failed.push(p);
    }
  }
  return { files, attached, failed };
}

function buildPersonPhotoInstructions(people: PersonPhoto[]): string {
  if (!people.length) return "";
  const names = people.map(p => p.name).join("، ");
  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE IMAGE(S) ATTACHED — CHECK BEFORE USING AS A FACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reference image(s) are attached, labeled as: ${names}.

FIRST, determine what each attached reference image actually is:

CASE A — it is an authentic photograph of a real human being's face:
* You MUST visibly include this person, using ONLY that attached photo for their face. This is an editorial portrait, not a reconstruction of the event.
* Do not modify, beautify, age, rejuvenate, or alter their facial features or ethnicity.
* Do not invent an alternative face for them.
* Preserve their identity exactly as shown in the attached photo.
* Integrate them naturally into the editorial scene (realistic lighting/composition matching the rest of the image).
* If the attached reference photo contains MULTIPLE people (e.g. a group/crowd photo), the label names only ONE specific individual in that photo — identify which face in the photo belongs to that named person and use ONLY that one face. Do not use, blend, or reference the faces of the other people who happen to appear in the same source photo, and do not include them in the output image at all. If you cannot confidently tell which face in a multi-person photo belongs to the named individual, treat this person per the "no authentic image" fallback below instead of guessing — never substitute a different attached face for them.

CASE B — it is NOT a photograph of a human face (e.g. an organization logo, emblem, seal, banner, flag, or any other graphic/symbol):
* Do NOT treat it as a person and do NOT use it as a face reference.
* Do NOT invent a human face to "represent" it.
* Place it into the composition only as what it actually is — a small graphic/emblem/badge/sign — reproduced as-is, not as a person.

Do NOT invent faces for anyone else who is not covered by an attached photo — for any other person mentioned in the story, keep using symbolic imagery only, per the blanket rule above.`;
}

// ── Flag accuracy ──────────────────────────────────────────────────────────────
// Image models default to outdated/deposed-regime flags from training data.
// Spell out the current flag explicitly for the cases most likely to come up
// in this channel's coverage instead of trusting the model's implicit memory.

function buildGeographicAccuracyRules(title: string, excerpt: string): string {
  const story = `${title} ${excerpt}`;
  const flags = [
    { match: /إيران|ايران|\bIran(?:ian)?\b/i, design: "Iran: green-white-red horizontal stripes, red national emblem centered on white, official white Kufic border inscription; no stars." },
    { match: /تونس|تونسي|\bTunisia(?:n)?\b/i, design: "Tunisia: red field, central white disc containing a red crescent and one red five-pointed star; no stripes." },
    { match: /اليمن|يمني|\bYemen(?:i)?\b/i, design: "Yemen: red-white-black horizontal stripes; no stars or emblem." },
    { match: /سوريا|سورية|سوري|\bSyria(?:n)?\b/i, design: "Syria: green-white-black horizontal stripes with three red five-pointed stars on white." },
  ].filter(({ match }) => match.test(story));
  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLAG ACCURACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If a national flag appears in the image, it MUST be the CURRENT, internationally recognized flag — never an outdated or deposed-regime flag.

Use only countries explicitly relevant to the supplied story. Templates provide branding and layout, never the story's country or flag. Do not copy flags from an unrelated reference or template.
${flags.map(({ design }) => design).join("\n")}

If a flag's identity or exact design is uncertain, omit it entirely. Never substitute another country's flag or an invented banner.

GEOGRAPHIC ACCURACY:
No verified map reference is supplied. Do not generate maps, coastlines, borders, country outlines, location pins, geographic labels, or cartographic insets. Use story-related ships, port infrastructure, documents, buildings, or abstract objects instead. Never invent spatial relationships. Show only the supplied headline; do not add place names to scenery or signs.`;
}

// ── No invented humans ───────────────────────────────────────────────────────
// The narrower "don't invent a named public figure's face" wording left a loophole:
// models would add an unnamed/generic person (a "lawyer", an "official", an elderly
// man in a suit) to make a scene feel populated, which is exactly what must never
// happen. This blanket rule closes that gap — no human figure at all, named or
// anonymous, unless a genuine photographic reference was attached for that specific
// person.

const NO_INVENTED_HUMANS_RULE = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NO INVENTED HUMANS — MOST IMPORTANT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do NOT include any human being, face, figure, silhouette-with-facial-features, or humanoid character in the image — UNLESS an authentic photographic reference was attached above for that specific, named real person.

This applies to EVERYONE, not just famous public figures:
* no invented politicians, ministers, journalists, judges, lawyers, or officials
* no generic/anonymous "representative" person (e.g. "a defendant", "a protester", "an elderly man holding documents") added purely to make the scene feel populated
* no invented person even when the story is about a named individual, an organization, a political party, or a court case — if no real photo of that person was attached, they simply do not appear as a person in the image

It is a fully acceptable, often preferable, result for the image to contain ZERO people — just the Albaalaagh template, thematic/symbolic imagery (courthouse, documents, scales of justice, logos, maps, buildings, objects) and the headline text. Do not add a person "to make it feel complete" — the scene is complete without one.

When in doubt, leave people out.`;

// When a real reference photo WAS attached, the "prefer zero people" framing above
// actively works against using it — the model was observed defaulting to a
// people-less symbolic image even with a clean, unambiguous, successfully attached
// photo, because the blanket rule tells it that omitting people is "often
// preferable." For this case the rule must instead mandate using the attached
// photo, and only fall back to "no invented humans" for anyone else in the story.
function buildNoInventedHumansRule(people: PersonPhoto[]): string {
  if (!people.length) return NO_INVENTED_HUMANS_RULE;
  const names = people.map(p => p.name).join("، ");
  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE CONTENT POLICY — MOST IMPORTANT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reference image(s) were attached with labels: ${names}. A label is descriptive text, NOT proof that the image depicts a person. Inspect the actual image first. CASE A — If a reference is an authentic, unambiguous human photograph, you MUST include that exact supplied person prominently on the RIGHT side as the main editorial subject. Their inclusion is REQUIRED, not optional. Preserve their face and identity from the attached photograph. Do not replace them with buildings, legal symbols, flags, or a symbolic-only scene, even for political, court, detention, or financial stories. The label identifies the supplied portrait; you do not need to recognize or independently verify a single-person portrait to use it. Use the photo as an editorial portrait, without depicting guilt or inventing actions. If it depicts fields, buildings, objects, a logo, an emblem, or any other non-human content (CASE B), use only that content and include ZERO people unless another supplied reference independently qualifies under CASE A. Never invent a presenter, official, farmer, or portrait to represent a non-human reference.

For anyone else mentioned in the story who has no attached reference photo, do not invent a face for them — no invented politicians, officials, journalists, or generic "representative" people. Keep the human presence in the scene limited to the named person(s) whose reference actually qualifies under CASE A. If none qualifies, show no humans, faces, bodies, crowds, silhouettes, or human-like figures.`;
}

export function buildNews16_9Prompt(title: string, excerpt: string, people: PersonPhoto[] = []): string {
  return `ALBAALAAGH NEWS CARD — 1280×720 LANDSCAPE

USE THE PROVIDED ALBAALAAGH TEMPLATE (the first attached image) EXACTLY AS THE BASE IMAGE.

DO NOT:
* change, move, or modify the logo or branding in any corner
* redesign the template borders or frame
* invent a new logo or corner design
* add "عاجل"
* add article summaries or paragraphs
* add bullet points or quotes

TEXT RULES:
* Show ONLY the news title — no other text.
* Place title on the LEFT side of the image.
* Large bold Arabic typography.
* Maximum 3 to 5 lines.
* Mobile readability is the priority.
* Do not fill the canvas with text — let the image carry the story.

VISUAL RULES:
The visual scene occupies the RIGHT side of the image.

${people.length ? `ATTACHED REFERENCES TAKE PRIORITY:
Inspect the reference image(s) AFTER the first template image. For each single-person portrait, prominently include the supplied person on the RIGHT, with the headline on the LEFT. Keep story-related objects secondary. A portrait remains required for a court or political story; do not infer guilt or invent actions. If a reference contains only non-human content, use that content as an object and do not invent a person. Only a request with no actual human portrait may use a symbolic-only composition.
REFERENCE ORDER:
${people.map((person, index) => `Image ${index + 2}: reference labeled ${person.name}`).join("\n")}` : `NO PERSON REFERENCE ATTACHED:
Create a realistic journalistic visual related to the story using unpopulated objects, accurate flags, buildings, documents, fields, crops, agricultural equipment, factories, ports, or ships. No meetings, crowds, portraits, or human silhouettes.`}

NEVER:
* show violence, blood, or graphic content
${buildNoInventedHumansRule(people)}
${buildPersonPhotoInstructions(people)}
${buildGeographicAccuracyRules(title, excerpt)}

NEWS STYLE:
* modern editorial newsroom graphic
* realistic documentary style
* cinematic lighting
* clean composition with strong focal point
* professional newspaper design
* high contrast
* 1280×720 landscape format

TITLE:
${title}

DESCRIPTION:
${excerpt || "—"}

TEMPLATE:
first attached image — use only its branding and frame. Replace sample headline and all sample editorial imagery in the content area, including any sample people or portraits. Template people are never authorized person references. Fill the content area using only the supplied story and qualifying references.`;
}

export interface GeneratedImageResult {
  url: string;
  failedPeople: string[];
}

export async function generateNewsImage(title: string, excerpt: string, people: PersonPhoto[] = []): Promise<GeneratedImageResult> {
  const templateBuffer = await fs.readFile(NEWS_16_9_TEMPLATE_PATH);
  const templateFile = await toFile(templateBuffer, "template.png", { type: "image/png" });
  const { files: personFiles, attached, failed } = await fetchPersonFiles(people);

  const imagePrompt = buildNews16_9Prompt(title, excerpt, attached);

  const result = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: personFiles.length ? [templateFile, ...personFiles] : templateFile,
    prompt: imagePrompt,
    size: "1280x720",
    quality: "medium",
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  const buffer = Buffer.from(b64, "base64");
  const key = `ai-images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const url = await uploadToR2(key, buffer, "image/png");
  return { url, failedPeople: failed.map((p) => p.name) };
}

const FACEBOOK_TEMPLATE_PATH = path.join(process.cwd(), "public", "news_announcement.png");

export function buildFacebookPrompt(title: string, excerpt: string, people: PersonPhoto[] = []): string {
  return `ALBAALAAGH NEWS CARD — 1080×1080 SQUARE

USE THE PROVIDED ALBAALAAGH TEMPLATE (the first attached image) EXACTLY AS THE BASE IMAGE.

Preserve the existing logo, branding, borders, and frame. Do not add "عاجل", summaries, paragraphs, bullet points, quotes, dates, or URLs.

${people.length ? `REFERENCE PHOTOS:
The attached reference photo(s) after the template are labeled: ${people.map(p => p.name).join("، ")}.
Use a reference as a face only when it is an authentic human photograph, preserve that person's identity exactly, and do not invent or add any other person. If a reference is a logo or emblem, reproduce it only as that object.` : `NO PEOPLE:
No authentic person photo is attached. Do not generate any human, face, figure, or depiction of a named person. Use objects and abstract symbolic imagery only.`}

TEXT RULES:
Show only the supplied news title, unchanged, in large bold Arabic typography, maximum 2 to 4 lines, with strong mobile readability.

VISUAL RULES:
Create one restrained, non-actionable editorial metaphor based only on the supplied story. For an AI-safety or cybersecurity story, prefer an abstract interface, lock, shield, warning symbol, or redacted report. Do not depict or explain harmful materials, construction, biological processes, technical mechanisms, or operational steps.
${buildGeographicAccuracyRules(title, excerpt)}
Use a modern premium newsroom style, realistic documentary lighting, clean composition, strong focal point, and high contrast.

TITLE:
${title}

DESCRIPTION:
${excerpt || "—"}

TEMPLATE:
attached image — preserve it exactly as the base, only fill the content area`;
}

export async function generateFacebookImage(title: string, excerpt: string, people: PersonPhoto[] = []): Promise<GeneratedImageResult> {
  const templateBuffer = await fs.readFile(FACEBOOK_TEMPLATE_PATH);
  const templateFile = await toFile(templateBuffer, "template.png", { type: "image/png" });
  const { files: personFiles, attached, failed } = await fetchPersonFiles(people);

  const result = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: personFiles.length ? [templateFile, ...personFiles] : templateFile,
    prompt: buildFacebookPrompt(title, excerpt, attached),
    size: "1024x1024",
    quality: "medium",
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  const buffer = await sharp(Buffer.from(b64, "base64"))
    .resize(1080, 1080)
    .png()
    .toBuffer();

  const key = `ai-images/fb-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const url = await uploadToR2(key, buffer, "image/png");
  return { url, failedPeople: failed.map((p) => p.name) };
}

const WRITING_ARTICLE_SYSTEM_PROMPT = `You are the official image prompt generator for Albaalaagh (قناة البلاغ).

Your task is NOT to generate images.

Your task is to generate a detailed image-generation prompt for an image generation API.

The content is a WRITING ARTICLE, OPINION ARTICLE, ANALYSIS ARTICLE, RELIGIOUS ARTICLE, INTELLECTUAL ESSAY, or COLUMN.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE SIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALWAYS generate:

1280px × 720px

Landscape format only.

Never generate:

* Square
* Portrait
* Vertical
* 1:1
* 4:5
* 9:16

This is mandatory.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PURPOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is NOT a breaking news image.

This is NOT a news card.

This is an editorial article cover.

The image must feel:

* intellectual
* reflective
* analytical
* serious
* premium
* magazine quality

Think:

Foreign Affairs

The Economist

Le Monde Diplomatique

Al Jazeera Opinion

Premium newspaper analysis section

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALBAALAAGH BRANDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always place:

Top-left corner:

قناة البلاغ

Official Albaalaagh feather logo

Under logo:

ALBAALAAGH

Never place branding elsewhere.

Never create alternative logos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITER IMAGE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULE.

The writer image is supplied by the system.

Use ONLY the supplied image.

Never create another face.

Never modify identity.

Never beautify.

Never age.

Never rejuvenate.

Never alter ethnicity.

Never alter facial features.

Never create a second version of the writer.

The writer must remain fully recognizable.

If no writer image is supplied, do not invent or generate a face — leave the right side as symbolic background instead of a portrait.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preferred composition:

Writer portrait:

Right side of image

40% to 50% of canvas

Headline:

Left side

Large Arabic typography

Maximum:

2 to 5 lines

Writer name:

Below headline

Smaller but clearly visible

Example hierarchy:

[ TITLE ]

إبراهيم الصغير

Never add:

* article body
* dates
* subtitles
* website URLs
* social media handles
* hashtags

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKGROUND GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The background must visually express the article theme.

Do NOT merely place the writer on a generic background.

Analyze the article content and create a symbolic editorial background.

Examples:

Religious article:

* mosque silhouette
* historical manuscripts
* Islamic geometric patterns
* scholarly atmosphere

Political analysis:

* parliament
* political maps
* diplomacy symbolism
* strategic imagery

Geopolitics:

* world map
* borders
* flags
* negotiations
* strategic routes

Economic article:

* charts
* ports
* industry
* trade routes
* energy infrastructure

Social issues:

* citizens
* urban environments
* symbolic public spaces

Historical article:

* archives
* manuscripts
* historical landmarks
* period symbolism

The background should support the article theme without overwhelming the writer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEXT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Display ONLY:

1. Article title

2. Writer name

Nothing else.

CRITICAL — VERBATIM TITLE RULE:

The article title supplied to you (labeled "العنوان") is the EXACT text that must appear on the image.

Reproduce it character-for-character. Do not paraphrase it. Do not summarize it. Do not shorten it. Do not invent a new, punchier, or more dramatic headline based on the article content. Do not pull a different heading from inside the article body/content instead of the supplied title.

The article content (labeled "محتوى المقال") is background context ONLY — use it to decide the imagery and mood. NEVER use it as a source for the headline text.

If the title is long, you may wrap it across up to 5 lines, but every word must remain unchanged and in order.

Never display:

* article excerpts
* descriptions
* dates
* quotes
* labels
* categories
* a rewritten/alternative headline

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Premium editorial cover.

Magazine-quality composition.

Elegant typography.

Sophisticated lighting.

Documentary realism.

Intellectual atmosphere.

High readability.

Mobile-friendly.

Professional newspaper design.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLOR RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use colors appropriate to the article theme.

Avoid:

* oversaturated colors
* clickbait colors
* neon effects
* gaming aesthetics

Prefer:

* deep blues
* dark grays
* warm editorial tones
* muted cinematic colors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Top-left:
Albaalaagh logo

Left:
Article title
Writer name

Right:
Writer portrait

Background:
Symbolic illustration of article subject

Balanced composition.

Clean editorial design.

Professional magazine cover appearance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL STYLE TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

premium editorial article cover,
intellectual magazine aesthetic,
documentary realism,
newspaper opinion section,
high contrast,
professional Arabic typography,
serious analytical atmosphere,
clean composition,
mobile readability,
1280×720 landscape format`;

async function buildWriterArticlePrompt(title: string, excerpt: string, writerName: string, hasWriterPhoto: boolean): Promise<string> {
  return generateWriterImagePrompt({ title, excerpt, writerName, hasWriterPhoto }, WRITING_ARTICLE_SYSTEM_PROMPT);
}

export async function generateWriterArticleImage(
  title: string,
  excerpt: string,
  writerName: string,
  writerImageUrl?: string | null
): Promise<string> {
  let writerFile: Awaited<ReturnType<typeof toFile>> | null = null;
  if (writerImageUrl) {
    const res = await fetch(writerImageUrl);
    if (res.ok) {
      const writerBuffer = Buffer.from(await res.arrayBuffer());
      writerFile = await toFile(writerBuffer, "writer.png", { type: res.headers.get("content-type") ?? "image/png" });
    }
  }

  const imagePrompt = await buildWriterArticlePrompt(title, excerpt, writerName, !!writerFile);

  const result = writerFile
    ? await getOpenAI().images.edit({
        model: "gpt-image-2",
        image: writerFile,
        prompt: imagePrompt,
        size: "1280x720",
        quality: "medium",
        n: 1,
      })
    : await getOpenAI().images.generate({
        model: "gpt-image-2",
        prompt: imagePrompt,
        size: "1280x720",
        quality: "medium",
        n: 1,
      });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  const buffer = Buffer.from(b64, "base64");
  const key = `ai-images/writer-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  return uploadToR2(key, buffer, "image/png");
}
