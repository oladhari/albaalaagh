const BASE_URL = "https://www.albaalaagh.com";

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: "article" | "news";
}

export async function postToLinkedIn(opts: PostOptions): Promise<void> {
  const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
  const ORG_ID       = process.env.LINKEDIN_ORGANIZATION_ID;
  const PERSON_ID    = process.env.LINKEDIN_PERSON_ID;

  if (!ACCESS_TOKEN) { console.error("LinkedIn: missing access token"); return; }

  const author = ORG_ID
    ? `urn:li:organization:${ORG_ID}`
    : PERSON_ID
    ? `urn:li:person:${PERSON_ID}`
    : null;
  if (!author) { console.error("LinkedIn: missing person/org ID"); return; }

  const url = opts.type === "article"
    ? `${BASE_URL}/articles/${opts.slug}`
    : `${BASE_URL}/taqrir/${opts.slug}`;

  const commentary = [
    opts.title,
    opts.writerName ? `✍️ ${opts.writerName}` : null,
    opts.excerpt ? `\n${opts.excerpt}` : null,
    `\n🔗 ${url}`,
    "\n\n#البلاغ #تونس #سياسة",
  ].filter(Boolean).join("\n");

  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: commentary },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            originalUrl: url,
            title: { text: opts.title },
            ...(opts.excerpt ? { description: { text: opts.excerpt } } : {}),
          },
        ],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  console.error("LinkedIn: attempting post for", opts.slug);
  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => res.text());
      console.error("LinkedIn post failed:", JSON.stringify(err));
    } else {
      const data = await res.json();
      console.error("LinkedIn post succeeded:", data.id);
    }
  } catch (err: any) {
    console.error("LinkedIn fetch error:", err.message);
  }
}
