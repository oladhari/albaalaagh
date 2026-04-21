const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = "@albaalaagh";
const BASE_URL   = "https://www.albaalaagh.com";

interface PostOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: "article" | "news";
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function postToTelegram(opts: PostOptions): Promise<void> {
  if (!BOT_TOKEN) return;

  const url = opts.type === "article"
    ? `${BASE_URL}/articles/${opts.slug}`
    : `${BASE_URL}/taqrir/${opts.slug}`;

  const lines = [
    `📰 <b>${esc(opts.title)}</b>`,
    opts.writerName ? `✍️ ${esc(opts.writerName)}` : null,
    opts.excerpt    ? `\n${esc(opts.excerpt)}`       : null,
    `\n🔗 <a href="${url}">اقرأ كاملاً</a>`,
    "\n#البلاغ",
  ].filter(Boolean).join("\n");

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:              CHANNEL_ID,
      text:                 lines,
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
