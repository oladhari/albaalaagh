import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { duplicate, identity, postInput, validateItem } from './client.mjs';

export function readLedger(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { version: 1, items: {} };
}
function save(path, state) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  renameSync(temporary, path);
}
export async function verifyMedia(url, fetcher = fetch) {
  const response = await fetcher(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('video/') || !(Number(response.headers.get('content-length')) > 0)) throw new Error('Public video HEAD verification failed');
  return { bytes: Number(response.headers.get('content-length')), content_type: response.headers.get('content-type') };
}
export async function submit({ client, target, item, ledgerPath, now = false, fetcher = fetch, reviewedRetry = '' }) {
  validateItem(item);
  if (target.isQueuePaused) throw new Error('TikTok queue is paused');
  mkdirSync(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  // Exclusive per-ledger lock prevents two workers from submitting the same item.
  // A stale lock requires manual inspection; it is never automatically removed.
  const lock = `${ledgerPath}.lock`;
  const descriptor = openSync(lock, 'wx', 0o600);
  try {
    const state = readLedger(ledgerPath);
    const key = identity(target.id, item);
    const existing = state.items[key] || Object.values(state.items).find(entry => entry.channel_id === target.id && entry.source_id === item.source_id);
    const retryAllowed = existing && ['submitting', 'unknown', 'error'].includes(existing.state) && reviewedRetry.trim().length >= 20;
    if (existing && ['submitting', 'unknown', 'error'].includes(existing.state) && !retryAllowed) throw new Error('Tracked submission requires review; automatic retry blocked');
    if (existing && !retryAllowed) return { skipped: true, reason: 'Already tracked; check status before any further action', entry: existing };
    if (retryAllowed && existing.post_id) throw new Error('A known Buffer post exists; inspect it instead of creating a replacement');
    const match = duplicate(await client.posts(target), item);
    if (match) return { skipped: true, reason: 'Matching video or caption already exists in Buffer', post: match };
    await verifyMedia(item.video_url, fetcher);
    state.items[key] = {
      source_id: item.source_id, video_url: item.video_url, channel_id: target.id,
      state: 'submitting', submitted_at: new Date().toISOString(),
      ...(retryAllowed ? { previous_attempt: existing, reviewed_retry: { note: reviewedRetry, at: new Date().toISOString() } } : {}),
    };
    // Persist BEFORE mutation. Crashes, timeouts, and ambiguous responses block retries.
    save(ledgerPath, state);
    try {
      const post = await client.create(postInput(target, item, now));
      state.items[key] = { ...state.items[key], state: post.status, post_id: post.id, post, updated_at: new Date().toISOString() };
      save(ledgerPath, state);
      return { skipped: false, post };
    } catch (error) {
      state.items[key].state = 'unknown';
      save(ledgerPath, state);
      throw new Error(`Submission outcome requires review; automatic retry blocked. ${error.message}`);
    }
  } finally {
    closeSync(descriptor);
    unlinkSync(lock);
  }
}
export async function syncStatus(client, ledgerPath, onlyPostId = null) {
  mkdirSync(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  const lock = `${ledgerPath}.lock`;
  const descriptor = openSync(lock, 'wx', 0o600);
  try {
    const state = readLedger(ledgerPath);
    for (const entry of Object.values(state.items)) {
      if (!entry.post_id) continue;
      if (onlyPostId && entry.post_id !== onlyPostId) continue;
      if (entry.state === 'sent' && entry.post?.externalLink) continue;
      const post = await client.post(entry.post_id);
      if (post.channelId !== entry.channel_id) throw new Error('Status channel mismatch');
      Object.assign(entry, { state: post.status, post, updated_at: new Date().toISOString() });
      save(ledgerPath, state);
    }
    return state;
  } finally {
    closeSync(descriptor);
    unlinkSync(lock);
  }
}

export async function retryFailedPost({ client, ledgerPath, postId, note, replacementUrl = null }) {
  if (!note || note.trim().length < 20) throw new Error('A retry review note is required');
  const lock = `${ledgerPath}.lock`;
  const descriptor = openSync(lock, 'wx', 0o600);
  try {
    const state = readLedger(ledgerPath);
    const entry = Object.values(state.items).find(entry => entry.post_id === postId);
    if (!entry || entry.state !== 'error') throw new Error('Only a tracked, confirmed failed post can be retried');
    if (replacementUrl) await verifyMedia(replacementUrl);
    entry.retry_history = [...(entry.retry_history || []), { at: new Date().toISOString(), note, previous_error: entry.post?.error, ...(replacementUrl ? { replacement_video_url: replacementUrl } : {}) }];
    entry.state = 'retrying';
    save(ledgerPath, state);
    try {
      const post = await client.retryExisting(postId, entry.channel_id, replacementUrl);
      Object.assign(entry, { state: post.status, post, updated_at: new Date().toISOString() });
      save(ledgerPath, state);
      return post;
    } catch (error) {
      entry.state = 'unknown_retry';
      save(ledgerPath, state);
      throw error;
    }
  } finally { closeSync(descriptor); unlinkSync(lock); }
}
