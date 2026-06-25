const PAGE_ID    = process.env.FB_PAGE_ID    ?? process.env.FB_PAGE2_ID;
const PAGE_TOKEN = process.env.FB_PAGE_TOKEN ?? process.env.FB_PAGE2_TOKEN;

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type?: "article" | "news";
  facebook_image?: string | null;
}

async function postPhotoWithComment(
  imageUrl: string,
  caption: string,
  articleUrl: string
): Promise<void> {
  const photoRes = await fetch(`https://graph.facebook.com/${PAGE_ID}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: imageUrl, caption, access_token: PAGE_TOKEN }),
  });
  if (!photoRes.ok) {
    const err = await photoRes.json();
    console.error("Facebook photo post failed:", err);
    return;
  }
  const { post_id, id } = await photoRes.json();
  const postId = post_id ?? id;
  if (!postId) return;

  // Link in first comment — avoids algorithm penalty for external links in caption
  const commentRes = await fetch(`https://graph.facebook.com/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `🔗 اقرأ التقرير كاملاً:\n${articleUrl}`, access_token: PAGE_TOKEN }),
  });
  if (!commentRes.ok) {
    const err = await commentRes.json();
    console.warn("Facebook comment failed:", err);
  }
}

export async function postArticleToFacebook(opts: PostOptions): Promise<void> {
  if (!PAGE_ID || !PAGE_TOKEN) return;

  const url = opts.type === "news"
    ? `https://www.albaalaagh.com/taqrir/${opts.slug}`
    : `https://www.albaalaagh.com/articles/${opts.slug}`;

  if (opts.facebook_image) {
    const caption = [
      opts.title,
      opts.writerName ? `✍️ ${opts.writerName}` : null,
      opts.excerpt ? `\n${opts.excerpt}` : null,
      opts.type === "news" ? "\nللمزيد، رابط التقرير كاملاً في أول تعليق 👇" : null,
      "\n#البلاغ #سياسة #تونس",
    ].filter(Boolean).join("\n");

    await postPhotoWithComment(opts.facebook_image, caption, url);
  } else {
    const message = [
      opts.title,
      opts.writerName ? `✍️ ${opts.writerName}` : null,
      opts.excerpt ? `\n${opts.excerpt}` : null,
      `\n🔗 اقرأ المقال كاملاً: ${url}`,
      "\n\n#البلاغ #سياسة #تونس",
    ].filter(Boolean).join("\n");

    const res = await fetch(`https://graph.facebook.com/${PAGE_ID}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, link: url, access_token: PAGE_TOKEN }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("Facebook post failed:", err);
    }
  }
}
