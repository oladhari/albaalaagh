import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markSent } from './site-tracking.mjs';

const entry = { source_id: 'site:66912150-f220-4311-bf43-8520551130b3', state: 'sent', post_id: 'buffer-id', post: { sentAt: '2026-10-26T00:00:00Z', externalLink: 'https://tiktok.com/@albaalaagh/video/123' } };
test('marks only confirmed delivered clips with a TikTok receipt', async () => {
  let written;
  const db = { from: table => { assert.equal(table, 'site_settings'); return { upsert: async row => { written = row; return {error:null}; } }; } };
  assert.equal(await markSent(db, {...entry, state:'sending'}), false);
  assert.equal(await markSent(db, {...entry, post:{externalLink:null}}), false);
  assert.equal(written, undefined);
  assert.equal(await markSent(db, entry), true);
  assert.equal(written.key, `tiktok_done:${entry.source_id.slice(5)}`);
  assert.equal(JSON.parse(written.value).url, entry.post.externalLink);
});
test('shared tracking failure is reported instead of claiming done', async () => {
  const db = { from: () => ({upsert:async()=>({error:{message:'database unavailable'}})}) };
  await assert.rejects(markSent(db, entry), /shared done mark failed/);
});
