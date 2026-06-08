const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = "@albaalaagh";
const BASE_URL   = "https://www.albaalaagh.com";

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: "article" | "news";
  facebook_image?: string | null;
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function postToTelegram(opts: PostOptions): Promise<void> {
  if (!BOT_TOKEN) return;

  const url = opts.type === "article"
    ? `${BASE_URL}/articles/${opts.slug}`
    : `${BASE_URL}/taqrir/${opts.slug}`;

  const caption = [
    `📰 <b>${esc(opts.title)}</b>`,
    opts.writerName ? `✍️ ${esc(opts.writerName)}` : null,
    opts.excerpt    ? `\n${esc(opts.excerpt)}`       : null,
    `\n🔗 <a href="${url}">اقرأ كاملاً</a>`,
    "\n#البلاغ",
  ].filter(Boolean).join("\n");

  if (opts.facebook_image) {
    // Photo post — image displayed prominently, link in caption
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    CHANNEL_ID,
        photo:      opts.facebook_image,
        caption,
        parse_mode: "HTML",
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        console.error("Telegram photo post failed:", err);
      }
    });
  } else {
    // No image — text message with link preview
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:              CHANNEL_ID,
        text:                 caption,
        parse_mode:           "HTML",
        link_preview_options: { is_disabled: false, url },
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        console.error("Telegram post failed:", err);
      }
    });
  }
}
