const PAGE_ID    = process.env.FB_PAGE_ID    ?? process.env.FB_PAGE2_ID;
const PAGE_TOKEN = process.env.FB_PAGE_TOKEN ?? process.env.FB_PAGE2_TOKEN;
const FB_API = "https://graph.facebook.com/v19.0";

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type?: "article" | "news";
  facebook_image?: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedIgUserId: string | null = null;

async function resolveIgUserId(): Promise<string | null> {
  if (cachedIgUserId) return cachedIgUserId;
  const res = await fetch(`${FB_API}/${PAGE_ID}?fields=instagram_business_account&access_token=${PAGE_TOKEN}`);
  const data = await res.json();
  const id = data.instagram_business_account?.id;
  if (!id) {
    console.error("Instagram: no linked business account (or token missing instagram_basic):", data);
    return null;
  }
  return (cachedIgUserId = id);
}

// Image containers usually finish fast, but still poll — a still-processing
// container returns error code 9007 on publish.
async function waitForIgContainer(containerId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const res  = await fetch(`${FB_API}/${containerId}?fields=status_code&access_token=${PAGE_TOKEN}`);
    const data = await res.json();
    if (data.status_code === "FINISHED") return true;
    if (data.status_code === "ERROR") {
      console.error("Instagram media processing failed:", data);
      return false;
    }
    await sleep(3_000);
  }
  console.error("Instagram media processing timed out");
  return false;
}

export async function postArticleToInstagram(opts: PostOptions): Promise<void> {
  if (!PAGE_ID || !PAGE_TOKEN || !opts.facebook_image) return;

  const igUserId = await resolveIgUserId();
  if (!igUserId) return;

  const url = opts.type === "news"
    ? `https://www.albaalaagh.com/taqrir/${opts.slug}`
    : `https://www.albaalaagh.com/articles/${opts.slug}`;

  // No "link in comment" trick here (unlike Facebook) — Instagram doesn't
  // render links as clickable in captions or comments either way, and the
  // token isn't scoped for instagram_manage_comments, so the link just goes
  // straight in the caption.
  const caption = [
    opts.title,
    opts.writerName ? `✍️ ${opts.writerName}` : null,
    opts.excerpt ? `\n${opts.excerpt}` : null,
    `\n🔗 ${url}`,
    "\n#البلاغ #سياسة #تونس",
  ].filter(Boolean).join("\n").slice(0, 2200);

  const initRes = await fetch(`${FB_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: opts.facebook_image, caption, access_token: PAGE_TOKEN }),
  });
  const initData = await initRes.json();
  if (!initRes.ok || !initData.id) {
    console.error("Instagram media container failed:", initData);
    return;
  }

  const ready = await waitForIgContainer(initData.id);
  if (!ready) return;

  const publishRes = await fetch(`${FB_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: initData.id, access_token: PAGE_TOKEN }),
  });
  if (!publishRes.ok) {
    const err = await publishRes.json();
    console.error("Instagram publish failed:", err);
  }
}
