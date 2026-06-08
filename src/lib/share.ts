import { postArticleToFacebook } from "@/lib/facebook";
import { postToTelegram } from "@/lib/telegram";
import { postToX } from "@/lib/twitter";
import { postToLinkedIn } from "@/lib/linkedin";
// Add new SNS imports here ↑

export interface ShareOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: "article" | "news";
  facebook_image?: string | null; // Facebook only (news: 1:1 square; articles: cover)
  image?: string | null;          // Telegram/X (news: image_url; articles: cover_image)
}

export async function shareToAll(opts: ShareOptions): Promise<void> {
  await Promise.allSettled([
    postArticleToFacebook(opts),
    postToTelegram(opts),
    postToX(opts),
    postToLinkedIn(opts),
    // Add new SNS calls here ↑
  ]);
}
