#!/usr/bin/env node
// Finite, explicitly selected manifest. Never discovers or expands a backlog.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { BufferClient, validateItem } from './client.mjs';
import { submit, syncStatus, readLedger } from './workflow.mjs';
import { syncDone } from './site-tracking.mjs';

const ledgerPath = '/mnt/linuxdata/albaalaagh-buffer-tiktok/ledger.json';
async function main() {
  const { values } = parseArgs({ options: { manifest: { type: 'string' }, publish: { type: 'boolean' } } });
  if (!values.manifest) throw new Error('Specify --manifest /absolute/path/selected.json; --publish is explicit opt-in');
  const manifest = JSON.parse(readFileSync(values.manifest, 'utf8'));
  if (!Array.isArray(manifest.site_ids) || !manifest.site_ids.length || new Set(manifest.site_ids).size !== manifest.site_ids.length) throw new Error('Manifest must contain unique selected site_ids');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const client = new BufferClient(process.env.BUFFER_TIKTOK_API);
  const target = await client.target();
  const items = [];
  for (const id of manifest.site_ids) {
    const { data, error } = await db.from('site_videos').select('id,title,description,video_url,published,video_type').eq('id', id).single();
    if (error || !data?.published || data.video_type !== 'short') throw new Error(`Published Short not found: ${id}`);
    items.push({ title: data.title, ...validateItem({ source_id: `site:${data.id}`, video_url: manifest.video_overrides?.[id] || data.video_url, caption: data.description?.trim() || data.title, ai_generated: false }) });
  }
  console.log(JSON.stringify({ selected_count: items.length, titles: items.map(item => item.title), publish: !!values.publish }));
  if (!values.publish) return;
  for (const [index, item] of items.entries()) {
    console.log(JSON.stringify({ progress: `${index + 1}/${items.length}`, title: item.title, action: 'checking' }));
    const result = await submit({ client, target, item, ledgerPath, now: true });
    const postId = result.post?.id || result.entry?.post_id;
    if (result.skipped && !postId) throw new Error('Remote duplicate needs reconciliation before continuing');
    console.log(JSON.stringify({ title: item.title, post_id: postId, initial_state: result.post?.status || result.entry?.state, skipped: result.skipped }));
    let sent = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      const state = await syncStatus(client, ledgerPath, postId);
      // Always preserve done marks, including a previously delivered clip.
      await syncDone(db, state);
      const entry = Object.values(state.items).find(entry => entry.post_id === postId);
      console.log(JSON.stringify({ title: item.title, state: entry?.state, url: entry?.post?.externalLink, error: entry?.post?.error }));
      if (entry?.state === 'sent') {
        if (!entry.post.externalLink) throw new Error('Sent but TikTok link missing; confirmation requires review');
        sent = true;
        break;
      }
      if (entry?.state === 'error') throw new Error('Buffer delivery failed; batch stopped');
      await delay(60000);
    }
    if (!sent) throw new Error('Delivery pending; batch stopped. Resume the same manifest after checking status, without resubmission.');
  }
  const state = readLedger(ledgerPath);
  console.log(JSON.stringify({ completed: items.length, marked_done: await syncDone(db, state) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
