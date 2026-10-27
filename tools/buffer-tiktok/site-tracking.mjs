// One row per Short avoids concurrent publishers overwriting a shared ID array.
export const DONE_PREFIX = 'tiktok_done:';
export async function markSent(db, entry) {
  if (entry.state !== 'sent' || !entry.post?.externalLink || !entry.source_id?.startsWith('site:')) return false;
  const id = entry.source_id.slice(5);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid website Short ID');
  const url = new URL(entry.post.externalLink);
  if (!['tiktok.com', 'www.tiktok.com'].includes(url.hostname) || url.protocol !== 'https:') throw new Error('Invalid TikTok delivery link');
  const { error } = await db.from('site_settings').upsert({
    key: `${DONE_PREFIX}${id}`,
    value: JSON.stringify({ site_id: id, state: 'sent', source: 'buffer', buffer_post_id: entry.post_id, url: entry.post.externalLink, sent_at: entry.post.sentAt, updated_at: new Date().toISOString() }),
  }, { onConflict: 'key' });
  if (error) throw new Error(`TikTok delivered but shared done mark failed: ${error.message}`);
  return true;
}
export async function syncDone(db, state) {
  let count = 0;
  for (const entry of Object.values(state.items)) if (await markSent(db, entry)) count++;
  return count;
}
