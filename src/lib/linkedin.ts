const ACCESS_TOKEN   = process.env.LINKEDIN_ACCESS_TOKEN;
const ORG_ID         = process.env.LINKEDIN_ORGANIZATION_ID;
const BASE_URL       = "https://www.albaalaagh.com";

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: "article" | "news";
}

export async function postToLinkedIn(opts: PostOptions): Promise<void> {
  if (!ACCESS_TOKEN || !ORG_ID) return;

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
    author: `urn:li:organization:${ORG_ID}`,
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

  await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => res.text());
      console.error("LinkedIn post failed:", JSON.stringify(err));
    } else {
      console.log("LinkedIn post succeeded");
    }
  });
}
