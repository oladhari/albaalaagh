import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h2", "h3", "h4", "ul", "ol", "li",
  "blockquote", "a", "img", "figure", "figcaption",
  "hr", "span", "div",
];

const ALLOWED_ATTR = ["href", "src", "alt", "target", "rel", "class", "style"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false,
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
