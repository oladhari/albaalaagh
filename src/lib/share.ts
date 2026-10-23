import { postArticleToFacebook } from "@/lib/facebook";
import { postArticleToInstagram } from "@/lib/instagram";
import { postToTelegram } from "@/lib/telegram";
import { postToX } from "@/lib/twitter";
import { postToLinkedIn } from "@/lib/linkedin";
// Add new SNS imports here ↑

import type { ShareOptions } from "./share-options";
export type { ShareOptions } from "./share-options";

export async function shareToAll(opts: ShareOptions): Promise<void> {
  await Promise.allSettled([
    postArticleToFacebook(opts),
    postArticleToInstagram(opts), // only fires when facebook_image is set — IG requires an image
    postToTelegram(opts),
    postToX(opts),
    postToLinkedIn(opts),
    // Add new SNS calls here ↑
  ]);
}
