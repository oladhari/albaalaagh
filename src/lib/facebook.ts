const PAGES = [
  { id: process.env.FB_PAGE1_ID, token: process.env.FB_PAGE1_TOKEN },
  { id: process.env.FB_PAGE2_ID, token: process.env.FB_PAGE2_TOKEN },
].filter((p) => p.id && p.token);

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
}

export async function postArticleToFacebook(opts: PostOptions): Promise<void> {
  if (PAGES.length === 0) return;

  const url = `https://www.albaalaagh.com/articles/${opts.slug}`;

  const message = [
    opts.title,
    opts.writerName ? `✍️ ${opts.writerName}` : null,
    opts.excerpt ? `\n${opts.excerpt}` : null,
    `\n🔗 اقرأ المقال كاملاً: ${url}`,
    "\n\n#البلاغ #سياسة #تونس",
  ]
    .filter(Boolean)
    .join("\n");

  await Promise.allSettled(
    PAGES.map((page) =>
      fetch(`https://graph.facebook.com/${page.id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          link: url,
          access_token: page.token,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          console.error(`Facebook post failed for page ${page.id}:`, err);
        }
      })
    )
  );
}
