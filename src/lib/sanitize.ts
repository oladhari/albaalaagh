import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h2", "h3", "h4", "ul", "ol", "li",
  "blockquote", "a", "img", "figure", "figcaption",
  "hr", "span", "div",
];

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["class", "style"],
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
  });
}

export function formatAndSanitize(content: string): string {
  let html = content;
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    html = content
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n");
  }
  return sanitizeHtml(html);
}
