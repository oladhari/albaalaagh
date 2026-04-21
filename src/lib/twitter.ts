import crypto from "crypto";

const API_KEY            = process.env.X_API_KEY;
const API_SECRET         = process.env.X_API_SECRET;
const ACCESS_TOKEN       = process.env.X_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const BASE_URL           = "https://www.albaalaagh.com";

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: "article" | "news";
}

function buildAuthHeader(method: string, url: string): string {
  const nonce     = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     API_KEY!,
    oauth_nonce:            nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        timestamp,
    oauth_token:            ACCESS_TOKEN!,
    oauth_version:          "1.0",
  };

  const paramStr = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join("&");

  const baseStr    = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(API_SECRET!)}&${encodeURIComponent(ACCESS_TOKEN_SECRET!)}`;
  const signature  = crypto.createHmac("sha1", signingKey).update(baseStr).digest("base64");

  const headerParts: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerStr = Object.keys(headerParts)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(headerParts[k])}"`)
    .join(", ");

  return `OAuth ${headerStr}`;
}

export async function postToX(opts: PostOptions): Promise<void> {
  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) return;

  const url = opts.type === "article"
    ? `${BASE_URL}/articles/${opts.slug}`
    : `${BASE_URL}/taqrir/${opts.slug}`;

  const lines = [
    opts.title,
    opts.writerName ? `✍️ ${opts.writerName}` : null,
    opts.excerpt ? `\n${opts.excerpt.slice(0, 150)}...` : null,
    `\n🔗 ${url}`,
    "\n#البلاغ #تونس",
  ].filter(Boolean).join("\n");

  // X has a 280 character limit
  const text = lines.length > 280 ? lines.slice(0, 277) + "..." : lines;

  const endpoint = "https://api.twitter.com/2/tweets";

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": buildAuthHeader("POST", endpoint),
    },
    body: JSON.stringify({ text }),
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json();
      console.error("X post failed:", err);
    }
  });
}
