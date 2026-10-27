#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferClient, duplicate, postInput, validateItem } from './client.mjs';
import { readLedger, submit, syncStatus, verifyMedia } from './workflow.mjs';
import { syncDone } from './site-tracking.mjs';

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  file: { type: 'string' }, 'site-id': { type: 'string' }, publish: { type: 'boolean' },
  now: { type: 'boolean' }, ledger: { type: 'string' }, help: { type: 'boolean' },
  'reviewed-retry': { type: 'string' },
} });
const command = positionals[0] || 'check';
const ledgerPath = resolve(values.ledger || '/mnt/linuxdata/albaalaagh-buffer-tiktok/ledger.json');

async function siteItem(id) {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await db.from('site_videos').select('id,title,description,video_url,published,video_type').eq('id', id).single();
  if (error || !data || !data.published || data.video_type !== 'short') throw new Error('Select one existing published website Short');
  return { source_id: `site:${data.id}`, video_url: data.video_url, caption: data.description?.trim() || data.title, ai_generated: false };
}
async function main() {
  if (values.help) {
    console.log('Usage: node --env-file=.env.local tools/buffer-tiktok/cli.mjs check|plan|submit|status [--site-id UUID | --file item.json] [--publish] [--now] [--ledger path]\nplan is read-only. submit requires --publish; queues by default. --now publishes immediately.\nJSON: {source_id, video_url, caption, ai_generated:boolean}. status reads remote posts, updates the local ledger, and marks verified deliveries done on the website.');
    return;
  }
  if (positionals.length > 1 || !['check', 'plan', 'submit', 'status'].includes(command)) throw new Error('Unknown command; use --help');
  if (values.publish && command !== 'submit') throw new Error('--publish is only valid with submit');
  if (values['reviewed-retry'] && (command !== 'submit' || !values.publish)) throw new Error('--reviewed-retry requires submit --publish and a note confirming manual absence checks');
  if (values.now && !['plan', 'submit'].includes(command)) throw new Error('--now requires plan or submit');
  const client = new BufferClient(process.env.BUFFER_TIKTOK_API);
  const target = await client.target();
  if (command === 'check') return console.log(JSON.stringify({ connected: true, target, ledger: ledgerPath }, null, 2));
  if (command === 'status') {
    const state = await syncStatus(client, ledgerPath);
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const done = await syncDone(db, state);
    return console.log(JSON.stringify({ ...state, shared_done_count: done }, null, 2));
  }
  if (!!values.file === !!values['site-id']) throw new Error('Specify exactly one --file or --site-id');
  const item = validateItem(values.file ? JSON.parse(readFileSync(values.file, 'utf8')) : await siteItem(values['site-id']));
  if (command === 'plan') {
    const media = await verifyMedia(item.video_url);
    const posts = await client.posts(target);
    console.log(JSON.stringify({ preview_only: true, target, item, media, duplicate: duplicate(posts, item) || null, ledger: readLedger(ledgerPath), input: postInput(target, item, values.now) }, null, 2));
    return;
  }
  if (!values.publish) throw new Error('No action taken: submit requires --publish');
  console.log(JSON.stringify(await submit({ client, target, item, ledgerPath, now: values.now, reviewedRetry: values['reviewed-retry'] }), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
