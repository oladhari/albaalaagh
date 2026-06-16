import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { uploadToR2 } from "@/lib/r2";

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const SYSTEM_PROMPT = `You are the official image prompt generator for Albaalaagh (قناة البلاغ).

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

Always include:

Top-left corner:

قناة البلاغ

Official Albaalaagh feather logo

Under logo:

ALBAALAAGH

Only there.

Never place ALBAALAAGH elsewhere.

Never invent another logo.

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

Standard layout:

Top-left:
Albaalaagh logo

Left:
Headline

Right:
Main visual

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

async function buildImagePrompt(title: string, excerpt: string): Promise<string> {
  const msg = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `العنوان: ${title}\nالوصف: ${excerpt || "—"}`,
    }],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  if (!text.trim()) throw new Error("Empty image prompt from Claude");
  return text.trim();
}

export async function generateNewsImage(title: string, excerpt: string): Promise<string> {
  const imagePrompt = await buildImagePrompt(title, excerpt);

  const result = await getOpenAI().images.generate({
    model: "gpt-image-2",
    prompt: imagePrompt,
    size: "1280x720",
    quality: "medium",
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  const buffer = Buffer.from(b64, "base64");
  const key = `ai-images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  return uploadToR2(key, buffer, "image/png");
}

const FACEBOOK_TEMPLATE_PATH = path.join(process.cwd(), "public", "news_announcement.png");

function buildFacebookPrompt(title: string, excerpt: string): string {
  return `ALBAALAAGH NEWS IMAGE GENERATION PROMPT

Create a professional news card for Albaalaagh using the ATTACHED ALBAALAAGH TEMPLATE as the base design.

MANDATORY REQUIREMENTS:

* Output size: 1080x1080 (1:1 square).
* USE THE PROVIDED TEMPLATE EXACTLY.
* Keep the Albaalaagh logo in the top-right corner exactly as it appears.
* Keep the template colors, borders, decorations, and branding unchanged.
* Do NOT redesign the template.
* Do NOT create a new layout.
* Do NOT remove or move the logo.
* Do NOT add "عاجل" unless it explicitly appears in the news title.
* Do NOT add extra text, summaries, bullet points, quotes, or article content.
* Display ONLY the news title.
* Title must be large, clean, readable on mobile devices, and preferably limited to 2–4 lines.
* Keep text minimal and visually balanced.

IMAGE SELECTION RULES:

1. If a reference image is provided:

   * Use the exact provided image.
   * Do not modify facial features.
   * Do not generate a different face.
   * Do not age, beautify, stylize, or alter the person.
   * Do not create another person that merely resembles them.

2. If NO image is provided:

   * Use neutral symbolic visuals related to the topic.
   * Use flags, buildings, maps, courtrooms, microphones, documents, airplanes, ports, ships, wheat fields, factories, parliament buildings, diplomatic tables, etc.
   * Never invent the face of a politician, minister, journalist, activist, judge, suspect, victim, or public figure.

3. For people:

   * Only use a person when a verified image is supplied.
   * Never generate a face from the article text.
   * Never guess how someone looks.
   * If no image exists, use symbolic visuals instead.

4. For crime, arrests, court cases, investigations:

   * Prefer symbolic visuals:
     court building,
     scales of justice,
     documents,
     police tape,
     microphone,
     prison bars,
     courthouse corridor.
   * Avoid fictional suspect images.

5. For political parties:

   * Use the official party logo if supplied.
   * Do not invent party logos.
   * Do not create fictional party headquarters.

6. For international diplomacy:

   * Use official flags,
     negotiation tables,
     documents,
     government buildings.
   * Avoid fictional leaders unless their image is supplied.

7. For accidents:

   * Use real supplied photos if available.
   * Otherwise use generic accident symbolism.
   * Do not fabricate detailed accident scenes.

8. For migration stories:

   * Avoid close-up identifiable faces.
   * Prefer symbolic imagery.

9. For education stories:

   * Use classrooms,
     exam papers,
     school buildings.
   * Avoid showing identifiable students.

10. For health stories:

    * Use hospitals,
      medical equipment,
      healthcare symbols.
    * Avoid fictional patients.

VISUAL STYLE:

* Professional newsroom style.
* Clean composition.
* Serious and credible.
* No clickbait.
* No sensationalism.
* No exaggerated explosions, fires, blood, destruction, or dramatic effects unless clearly visible in supplied source images.
* No cinematic movie-poster style.
* No propaganda style.
* No AI-looking faces.

INPUTS:

TITLE:
${title}

DESCRIPTION:
${excerpt || "—"}

REFERENCE IMAGE(S):
none

TEMPLATE:
attached image — use exactly as the base design

Generate a final Albaalaagh news card that strictly follows these rules.`;
}

export async function generateFacebookImage(title: string, excerpt: string): Promise<string> {
  const templateBuffer = await fs.readFile(FACEBOOK_TEMPLATE_PATH);
  const templateFile = await toFile(templateBuffer, "template.png", { type: "image/png" });

  const result = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: templateFile,
    prompt: buildFacebookPrompt(title, excerpt),
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
  return uploadToR2(key, buffer, "image/png");
}
