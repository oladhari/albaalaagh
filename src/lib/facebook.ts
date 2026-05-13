const PAGES = [
  { id: process.env.FB_PAGE1_ID, token: process.env.FB_PAGE1_TOKEN },
  { id: process.env.FB_PAGE2_ID, token: process.env.FB_PAGE2_TOKEN },
].filter((p) => p.id && p.token);

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type?: "article" | "news";
  facebook_image?: string | null;
}

async function postPhotoWithComment(
  pageId: string,
  token: string,
  imageUrl: string,
  caption: string,
  linkComment: string
): Promise<void> {
  // 1. Post the photo
  const photoRes = await fetch(`https://graph.facebook.com/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: imageUrl, caption, access_token: token }),
  });
  if (!photoRes.ok) {
    const err = await photoRes.json();
    console.error(`Facebook photo post failed for page ${pageId}:`, err);
    return;
  }
  const { post_id, id } = await photoRes.json();
  const postId = post_id ?? id;
  if (!postId) return;

  // 2. Add link as first comment
  await fetch(`https://graph.facebook.com/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: linkComment, access_token: token }),
  });
}

export async function postArticleToFacebook(opts: PostOptions): Promise<void> {
  if (PAGES.length === 0) return;

  const url = opts.type === "news"
    ? `https://www.albaalaagh.com/taqrir/${opts.slug}`
    : `https://www.albaalaagh.com/articles/${opts.slug}`;

  if (opts.facebook_image) {
    // Photo post — link goes in first comment for maximum reach
    const caption = [
      opts.title,
      opts.writerName ? `✍️ ${opts.writerName}` : null,
      opts.excerpt ? `\n${opts.excerpt}` : null,
      "\n\n#البلاغ #سياسة #تونس",
    ].filter(Boolean).join("\n");

    const linkComment = `🔗 اقرأ التقرير كاملاً:\n${url}`;

    await Promise.allSettled(
      PAGES.map((page) =>
        postPhotoWithComment(page.id!, page.token!, opts.facebook_image!, caption, linkComment)
      )
    );
  } else {
    // Fallback: link post (no facebook image uploaded)
    const message = [
      opts.title,
      opts.writerName ? `✍️ ${opts.writerName}` : null,
      opts.excerpt ? `\n${opts.excerpt}` : null,
      `\n🔗 اقرأ المقال كاملاً: ${url}`,
      "\n\n#البلاغ #سياسة #تونس",
    ].filter(Boolean).join("\n");

    await Promise.allSettled(
      PAGES.map((page) =>
        fetch(`https://graph.facebook.com/${page.id}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, link: url, access_token: page.token }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            console.error(`Facebook post failed for page ${page.id}:`, err);
          }
        })
      )
    );
  }
}
