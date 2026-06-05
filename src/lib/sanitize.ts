import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  // Structure
  "div", "section", "p", "br", "hr", "span",
  // Headings
  "h1", "h2", "h3", "h4", "h5", "h6",
  // Inline formatting
  "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "sup", "sub",
  // Lists
  "ul", "ol", "li",
  // Links & media
  "a", "img", "figure", "figcaption", "picture", "source",
  // Quotes & code
  "blockquote", "cite", "q", "pre", "code",
  // Tables
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
];

// AI citation markers injected by ChatGPT (e.g. :contentReference[oaicite:0]{index=0})
const AI_ARTIFACT_RE = /:contentReference\[oaicite:\d+\]\{index=\d+\}/g;

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["class", "style", "id", "dir", "lang"],
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading", "srcset", "sizes"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
      source: ["src", "srcset", "type", "media", "sizes"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: {
      img: ["https", "http", "data"],
    },
  });
}

export function formatAndSanitize(content: string): string {
  let html = content.replace(AI_ARTIFACT_RE, "").trim();

  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = html
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n");
  }
  return sanitizeHtml(html);
}
