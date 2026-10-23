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

// Reports may embed videos only from YouTube's privacy-enhanced player.
// Other article content retains the existing, stricter media policy.
export function formatReportContent(content: string): string {
  return sanitizeHtmlLib(content.replace(AI_ARTIFACT_RE, ""), {
    allowedTags: [...ALLOWED_TAGS, "iframe"],
    allowedAttributes: {
      "*": ["class", "id", "dir", "lang", "role", "tabindex", "aria-label"],
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"],
      iframe: ["src", "title", "width", "height", "allowfullscreen", "loading", "referrerpolicy"],
    },
    allowedSchemes: ["https", "mailto"],
    allowedIframeHostnames: ["www.youtube-nocookie.com"],
    allowIframeRelativeUrls: false,
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}) } }),
      iframe: (_tagName, attribs) => {
        const valid = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}(?:\?.*)?$/.test(attribs.src ?? "");
        return valid ? { tagName: "iframe", attribs: { ...attribs, loading: "lazy", referrerpolicy: "strict-origin-when-cross-origin", allowfullscreen: "" } } : { tagName: "span", attribs: {} };
      },
    },
  });
}
