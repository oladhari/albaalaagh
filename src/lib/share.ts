import { postArticleToFacebook } from "@/lib/facebook";
import { postArticleToInstagram } from "@/lib/instagram";
import { postToTelegram } from "@/lib/telegram";
import { postToX } from "@/lib/twitter";
import { postToLinkedIn } from "@/lib/linkedin";
import { postNewsToBufferNetwork } from "@/lib/buffer-news";
// Add new SNS imports here ↑

import type { ShareOptions } from "./share-options";
export type { ShareOptions } from "./share-options";

export async function shareToAll(opts: ShareOptions): Promise<void> {
  const results = await Promise.allSettled([
    postArticleToFacebook(opts),
    postArticleToInstagram(opts), // only fires when facebook_image is set — IG requires an image
    postToTelegram(opts),
    opts.type === "news" ? postNewsToBufferNetwork(opts, "twitter") : postToX(opts),
    opts.type === "news" ? postNewsToBufferNetwork(opts, "linkedin") : postToLinkedIn(opts),
    // Add new SNS calls here ↑
  ]);
  results.forEach((result, index) => {
    if (result.status === "rejected") console.error("Social publication failed", index, result.reason instanceof Error ? result.reason.message : "Unknown error");
  });
}
