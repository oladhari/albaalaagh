import { createHash } from 'node:crypto';

export const POST_FIELDS = 'id channelId text status schedulingType dueAt sentAt externalLink assets { source } error { message }';
export const CREATE_POST_MUTATION = `mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{${POST_FIELDS}}} ... on MutationError{message}}}`;
export const RETRY_POST_MUTATION = `mutation($input:EditPostInput!){editPost(input:$input){__typename ... on PostActionSuccess{post{${POST_FIELDS}}} ... on MutationError{message}}}`;

export class BufferClient {
  constructor(key, fetcher = fetch) {
    if (!key) throw new Error('BUFFER_TIKTOK_API is missing');
    this.key = key;
    this.fetcher = fetcher;
  }
  async request(query, variables = {}) {
    const response = await this.fetcher('https://api.buffer.com', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const messages = result?.errors?.map(error => error.message).filter(message => typeof message === 'string') || [];
      const detail = messages.join('; ').replaceAll(this.key, '[REDACTED]').slice(0, 700);
      const reference = response.headers.get('x-request-id') || response.headers.get('cf-ray');
      const retryAfter = response.headers.get('retry-after');
      const error = new Error(`Buffer HTTP ${response.status}${detail ? `: ${detail}` : ''}${reference ? ` (reference ${reference})` : ''}${retryAfter ? `; Retry-After: ${retryAfter} seconds` : ''}; do not retry a submission without checking status`);
      error.status = response.status;
      error.retryAfterSeconds = retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : null;
      throw error;
    }
    const result = await response.json();
    if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
    if (!result.data) throw new Error('Buffer response has no data');
    return result.data;
  }
  async target() {
    const { account } = await this.request('{ account { organizations { id } } }');
    const targets = [];
    for (const org of account.organizations) {
      const { channels } = await this.request('query($input:ChannelsInput!){channels(input:$input){id name service isQueuePaused}}', { input: { organizationId: org.id } });
      for (const channel of channels) {
        if (channel.service === 'tiktok' && channel.name.toLowerCase().replace(/^@/, '') === 'albaalaagh') targets.push({ ...channel, organizationId: org.id });
      }
    }
    if (targets.length !== 1) throw new Error('Expected exactly one connected albaalaagh TikTok channel');
    return targets[0];
  }
  async posts(target) {
    const posts = [];
    let after = null;
    do {
      const data = await this.request(`query($input:PostsInput!,$after:String){posts(input:$input,first:100,after:$after){edges{node{${POST_FIELDS}}} pageInfo{hasNextPage endCursor}}}`, { input: { organizationId: target.organizationId, filter: { channelIds: [target.id] } }, after });
      posts.push(...data.posts.edges.map(e => e.node));
      const page = data.posts.pageInfo;
      if (page.hasNextPage && (!page.endCursor || page.endCursor === after)) throw new Error('Buffer pagination incomplete; stopping');
      after = page.hasNextPage ? page.endCursor : null;
    } while (after);
    return posts;
  }
  async post(id) {
    const data = await this.request(`query($input:PostInput!){post(input:$input){${POST_FIELDS}}}`, { input: { id } });
    return data.post;
  }
  async create(input) {
    const data = await this.request(CREATE_POST_MUTATION, { input });
    const result = data.createPost;
    if (result.__typename !== 'PostActionSuccess' || !result.post?.id) throw new Error(`Buffer submission did not return a post: ${result.message || result.__typename}`);
    return result.post;
  }
  async retryExisting(id, channelId, replacementUrl = null) {
    const { post: current } = await this.request(`query($input:PostInput!){post(input:$input){${POST_FIELDS} metadata{... on TiktokPostMetadata{isAiGenerated}}}}`, { input: { id } });
    if (current.status !== 'error' || current.externalLink || current.channelId !== channelId) throw new Error('Retry requires a confirmed failed post on the expected channel, without a delivery receipt');
    if (current.assets.length !== 1 || !current.assets[0].source || typeof current.metadata?.isAiGenerated !== 'boolean') throw new Error('Stored TikTok video metadata is incomplete; review before retry');
    if (replacementUrl) validateItem({ source_id: `retry:${id}`, video_url: replacementUrl, caption: current.text, ai_generated: current.metadata.isAiGenerated });
    // The live API validates a complete post on edit, so preserve its stored
    // text, media and AI declaration explicitly rather than clearing them.
    const data = await this.request(RETRY_POST_MUTATION, { input: {
      id, mode: 'shareNow', schedulingType: 'automatic', text: current.text,
      assets: [{video:{url:replacementUrl || current.assets[0].source}}],
      metadata: {tiktok:{isAiGenerated:current.metadata.isAiGenerated}},
    } });
    const result = data.editPost;
    if (result.__typename !== 'PostActionSuccess' || result.post?.id !== id) throw new Error(`Retry outcome requires review: ${result.message || result.__typename}`);
    return result.post;
  }
}

export function validateItem(item) {
  if (typeof item.source_id !== 'string' || !item.source_id.trim()) throw new Error('A stable source_id is required');
  if (typeof item.caption !== 'string' || !item.caption.trim() || [...item.caption].length > 2200) throw new Error('Caption must contain 1–2200 characters; it will not be truncated');
  const url = new URL(item.video_url);
  if (url.origin !== 'https://media.albaalaagh.com' || !url.pathname.startsWith('/shorts/') || !url.pathname.endsWith('.mp4') || url.search || url.hash || url.username || url.password) throw new Error('Use an existing public https://media.albaalaagh.com/shorts/*.mp4 file');
  if (typeof item.ai_generated !== 'boolean') throw new Error('Set ai_generated explicitly to true or false');
  return item;
}
export function identity(channelId, item) {
  return createHash('sha256').update(`${channelId}\n${item.video_url}`).digest('hex');
}
const normalize = text => text.normalize('NFC').replace(/\s+/gu, ' ').trim();
export function duplicate(posts, item) {
  return posts.find(post => post.assets?.some(asset => asset.source === item.video_url) || normalize(post.text) === normalize(item.caption));
}
export function postInput(target, item, now = false) {
  validateItem(item);
  return {
    channelId: target.id, text: item.caption, schedulingType: 'automatic',
    mode: now ? 'shareNow' : 'addToQueue', needsApproval: false,
    assets: [{ video: { url: item.video_url } }],
    metadata: { tiktok: { isAiGenerated: item.ai_generated } },
  };
}
