import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BufferClient, duplicate, postInput, validateItem } from './client.mjs';
import { submit, readLedger, syncStatus } from './workflow.mjs';

const target = { id: 'channel', organizationId: 'org', isQueuePaused: false };
const item = { source_id: 'site:one', video_url: 'https://media.albaalaagh.com/shorts/test.mp4', caption: 'عنوان عربي 2026', ai_generated: false };
const media = async () => new Response(null, { headers: { 'content-type': 'video/mp4', 'content-length': '100' } });
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'buffer-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, 'ledger.json');
}
test('preserves Arabic captions, queues automatically and labels AI explicitly', () => {
  const input = postInput(target, item);
  assert.equal(input.text, item.caption);
  assert.equal(input.mode, 'addToQueue');
  assert.equal(input.schedulingType, 'automatic');
  assert.equal(input.metadata.tiktok.isAiGenerated, false);
  assert.equal(postInput(target, item, true).mode, 'shareNow');
  assert.throws(() => validateItem({ ...item, caption: 'ا'.repeat(2201) }));
  assert.throws(() => validateItem({ ...item, video_url: 'https://example.com/private.mp4' }));
  assert.throws(() => validateItem({ ...item, ai_generated: undefined }));
});
test('detects existing manual Buffer post by caption or media', () => {
  assert.ok(duplicate([{ text: 'عنوان  عربي\n2026', assets: [] }], item));
  assert.ok(duplicate([{ text: 'another caption', assets: [{ source: item.video_url }] }], item));
});
test('records submission before network mutation; repeated invocation never resubmits', async t => {
  const ledgerPath = fixture(t);
  let calls = 0;
  const client = { posts: async () => [], create: async input => {
    calls++;
    assert.equal(Object.values(readLedger(ledgerPath).items)[0].state, 'submitting');
    return { id: 'post', channelId: target.id, status: 'scheduled', text: input.text };
  } };
  const args = { client, target, item, ledgerPath, fetcher: media };
  assert.equal((await submit(args)).post.id, 'post');
  assert.equal((await submit(args)).skipped, true);
  assert.equal(calls, 1);
  assert.equal(existsSync(`${ledgerPath}.lock`), false);
});
test('timeout leaves unknown state and blocks retry', async t => {
  const ledgerPath = fixture(t);
  let calls = 0;
  const args = { target, item, ledgerPath, fetcher: media, client: { posts: async () => [], create: async () => { calls++; throw Error('timeout'); } } };
  await assert.rejects(submit(args), /automatic retry blocked/);
  assert.equal(Object.values(readLedger(ledgerPath).items)[0].state, 'unknown');
  await assert.rejects(submit(args), /automatic retry blocked/);
  assert.equal(calls, 1);
});
test('remote duplicates and invalid media never trigger mutation', async t => {
  const ledgerPath = fixture(t);
  const client = { posts: async () => [{ id: 'existing', text: item.caption }], create: async () => assert.fail('mutation') };
  assert.equal((await submit({ client, target, item, ledgerPath, fetcher: media })).skipped, true);
  client.posts = async () => [];
  await assert.rejects(submit({ client, target, item, ledgerPath, fetcher: async () => new Response(null, { status: 404 }) }), /verification failed/);
  assert.equal(existsSync(ledgerPath), false);
});
test('concurrent invocation cannot pass the exclusive ledger lock', async t => {
  const ledgerPath = fixture(t);
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const client = { posts: async () => { entered(); await gate; return []; }, create: async () => ({ id: 'one', status: 'scheduled' }) };
  const args = { client, target, item, ledgerPath, fetcher: media };
  const first = submit(args);
  await started;
  await assert.rejects(submit(args), /EEXIST/);
  release();
  await first;
});
test('status distinguishes queued posts from sent posts and retains TikTok URL', async t => {
  const ledgerPath = fixture(t);
  const client = { posts: async () => [], create: async () => ({ id: 'one', status: 'scheduled' }), post: async () => ({ id: 'one', channelId: target.id, status: 'sent', externalLink: 'https://www.tiktok.com/@albaalaagh/video/123' }) };
  await submit({ client, target, item, ledgerPath, fetcher: media });
  const state = await syncStatus(client, ledgerPath);
  const entry = Object.values(state.items)[0];
  assert.equal(entry.state, 'sent');
  assert.match(entry.post.externalLink, /tiktok.com/);
});
test('API auth failure stops without exposing key or retrying', async () => {
  let calls = 0;
  const client = new BufferClient('test-secret', async () => { calls++; return new Response('private response', { status: 401 }); });
  await assert.rejects(client.target(), error => !error.message.includes('test-secret') && /401/.test(error.message));
  assert.equal(calls, 1);
});

test('actual create request has balanced GraphQL selections and preserves variables', async () => {
  const client = new BufferClient('test-secret', async (_url, options) => {
    const {query, variables} = JSON.parse(options.body);
    let depth = 0;
    for (const char of query) {
      if (char === '{') depth++;
      if (char === '}') depth--;
      assert.ok(depth >= 0, 'selection closed too early');
    }
    assert.equal(depth, 0, 'unterminated GraphQL selection');
    assert.deepEqual(variables.input, postInput(target, item));
    return Response.json({data:{createPost:{__typename:'PostActionSuccess',post:{id:'created',status:'scheduled'}}}});
  });
  assert.equal((await client.create(postInput(target, item))).id, 'created');
});

test('reviewed retry preserves audit history and still checks remote duplicates', async t => {
  const ledgerPath = fixture(t);
  const client = { posts: async () => [], create: async () => { throw Error('syntax error before execution'); } };
  const args = { client, target, item, ledgerPath, fetcher: media };
  await assert.rejects(submit(args));
  client.create = async () => ({id:'corrected',status:'sending'});
  const result = await submit({...args, reviewedRetry:'Confirmed syntax failure before execution; remote history and TikTok checked absent'});
  assert.equal(result.post.id, 'corrected');
  const entry = Object.values(readLedger(ledgerPath).items)[0];
  assert.equal(entry.previous_attempt.state, 'unknown');
  assert.ok(entry.reviewed_retry.note);
});

test('completed receipts are never repeatedly polled', async t => {
  const ledgerPath = fixture(t);
  let calls = 0;
  const client = { posts: async () => [], create: async () => ({id:'completed',status:'sent',externalLink:'https://tiktok.com/@albaalaagh/video/123'}), post: async () => { calls++; throw Error('should not poll sent receipt'); } };
  await submit({client,target,item,ledgerPath,fetcher:media});
  await syncStatus(client, ledgerPath);
  assert.equal(calls, 0);
});

test('rate limit errors expose Retry-After and do not retry automatically', async () => {
  let calls = 0;
  const client = new BufferClient('secret', async () => { calls++; return Response.json({errors:[{message:'rate limit'}]}, {status:429,headers:{'Retry-After':'326'}}); });
  await assert.rejects(client.target(), error => error.status === 429 && error.retryAfterSeconds === 326 && /Retry-After/.test(error.message));
  assert.equal(calls, 1);
});

test('retry edits the same failed post and preserves stored content', async () => {
  let calls = 0;
  const current = {id:'failed',channelId:target.id,status:'error',externalLink:null,text:item.caption,assets:[{source:'https://stored.example/video.mp4'}],metadata:{isAiGenerated:false}};
  const client = new BufferClient('test-secret', async (_url, options) => {
    const request = JSON.parse(options.body);
    calls++;
    if (calls === 1) return Response.json({data:{post:current}});
    assert.match(request.query, /editPost/);
    assert.equal(request.variables.input.id, current.id);
    assert.equal(request.variables.input.text, current.text);
    assert.equal(request.variables.input.assets[0].video.url, current.assets[0].source);
    assert.equal(request.variables.input.metadata.tiktok.isAiGenerated, false);
    return Response.json({data:{editPost:{__typename:'PostActionSuccess',post:{...current,status:'sending'}}}});
  });
  assert.equal((await client.retryExisting('failed',target.id)).id, 'failed');
  assert.equal(calls, 2);
});
