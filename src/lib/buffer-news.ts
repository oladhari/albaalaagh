import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabase";
import { shareUrl, type ShareOptions } from "./share-options";

type Network = "twitter" | "linkedin";
type BufferPost = { id: string; channelId: string; status: string; externalLink?: string | null; error?: { message: string } | null };
type Receipt = { network: Network; channelId: string; sourceUrl: string; state: string; post?: BufferPost; updatedAt: string };
const prefix = "buffer_news:";
const fields = "id channelId status externalLink error{message}";

async function request(query: string, variables: object): Promise<Record<string, unknown>> {
  const key = process.env.BUFFER_TIKTOK_API;
  if (!key) throw new Error("Buffer news: missing API key");
  // No automatic POST retry: a timeout can mean the post was already accepted.
  const response = await fetch("https://api.buffer.com", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Buffer news HTTP ${response.status}; inspect receipt before retrying`);
  const result = await response.json();
  if (result.errors?.length || !result.data) throw new Error("Buffer news: API rejected request; inspect receipt");
  return result.data;
}

function clip(text: string, limit: number): string {
  const chars = Array.from(text.replace(/\s+/gu, " ").trim());
  return chars.length <= limit ? chars.join("") : chars.slice(0, Math.max(0, limit - 1)).join("").replace(/\s+\S*$/u, "") + "…";
}
export function newsBufferInput(opts: ShareOptions, network: Network, channelId: string) {
  const url = shareUrl(opts);
  const hashtags = "#البلاغ #تونس";
  // Count full URL length conservatively; never truncate the link or hashtags.
  const budget = (network === "twitter" ? 280 : 3000) - Array.from(`\n\n${url}\n\n${hashtags}`).length;
  const title = clip(opts.title, budget);
  const room = budget - Array.from(title).length - 2;
  const excerpt = room >= 25 && opts.excerpt ? clip(opts.excerpt, room) : "";
  const text = [title, excerpt, url, hashtags].filter(Boolean).join("\n\n");
  // News uses the exact square Facebook asset, never a landscape fallback.
  if (!opts.facebook_image) throw new Error("Buffer news requires the Facebook square image");
  const image = new URL(opts.facebook_image);
  if (image.protocol !== "https:" || image.username || image.password) throw new Error("Invalid Buffer news image URL");
  return { channelId, text, schedulingType: "automatic", mode: "shareNow", needsApproval: false, assets: [{ image: { url: image.href } }] };
}

export function newsBufferKey(opts: ShareOptions, network: Network, channelId: string): string {
  return prefix + createHash("sha256").update(`${network}\n${channelId}\n${opts.sourceId || shareUrl(opts)}`).digest("hex");
}
async function save(key: string, receipt: Receipt) {
  receipt.updatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.from("site_settings").update({ value: JSON.stringify(receipt) }).eq("key", key);
  if (error) throw new Error("Buffer news: could not save receipt");
}
async function refresh(key: string, receipt: Receipt) {
  if (!receipt.post?.id || receipt.state === "sent" || receipt.state === "error") return receipt;
  const data = await request(`query($input:PostInput!){post(input:$input){${fields}}}`, { input: { id: receipt.post.id } });
  const post = data.post as BufferPost;
  if (!post || post.channelId !== receipt.channelId) throw new Error("Buffer news receipt channel mismatch");
  receipt.post = post;
  receipt.state = post.status === "sent" && !post.externalLink ? "awaiting_link" : post.status;
  await save(key, receipt);
  return receipt;
}

export async function postNewsToBufferNetwork(opts: ShareOptions, network: Network) {
  if (opts.type !== "news") throw new Error("Buffer news adapter only accepts news");
  const channelId = network === "twitter" ? process.env.BUFFER_X_CHANNEL_ID : process.env.BUFFER_LINKEDIN_CHANNEL_ID;
  if (!channelId || !process.env.BUFFER_TIKTOK_API) throw new Error(`Buffer news ${network}: configuration missing`);
  const input = newsBufferInput(opts, network, channelId);
  const key = newsBufferKey(opts, network, channelId);
  const receipt: Receipt = { network, channelId, sourceUrl: shareUrl(opts), state: "submitting", updatedAt: new Date().toISOString() };
  // A unique key atomically claims this source across concurrent clicks/instances.
  const { error } = await supabaseAdmin.from("site_settings").insert({ key, value: JSON.stringify(receipt) });
  if (error?.code === "23505") {
    const previous = await supabaseAdmin.from("site_settings").select("value").eq("key", key).single();
    if (previous.error || !previous.data) throw new Error("Buffer news: existing receipt unavailable; no resubmission");
    const existing = JSON.parse(previous.data.value) as Receipt;
    if (!existing.post?.id) throw new Error("Buffer news: unknown previous outcome; manual review required");
    return refresh(key, existing);
  }
  if (error) throw new Error("Buffer news: unable to claim publication; nothing submitted");
  try {
    const data = await request(`mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{${fields}}} ... on MutationError{message}}}`, { input });
    const result = data.createPost as { __typename: string; post?: BufferPost };
    if (result.__typename !== "PostActionSuccess" || !result.post?.id) throw new Error("Buffer news: submission rejected");
    receipt.post = result.post;
    receipt.state = result.post.status === "sent" && !result.post.externalLink ? "awaiting_link" : result.post.status;
    await save(key, receipt);
    console.info("Buffer news submitted", network, result.post.id, receipt.state);
    return receipt;
  } catch (error) {
    // Keep a known accepted post ID if persistence failed; never create another post.
    if (!receipt.post?.id) receipt.state = "unknown";
    await save(key, receipt);
    throw error;
  }
}

export async function syncBufferNews() {
  const { data, error } = await supabaseAdmin.from("site_settings").select("key,value").like("key", `${prefix}%`).limit(1000);
  if (error) throw new Error("Buffer news receipt lookup failed");
  let checked = 0;
  for (const row of data || []) {
    const receipt = JSON.parse(row.value) as Receipt;
    if (receipt.post?.id && !["sent", "error"].includes(receipt.state)) {
      await refresh(row.key, receipt); checked++;
      if (checked >= 20) break; // Bound API use and invocation duration.
    }
  }
  return { checked };
}
