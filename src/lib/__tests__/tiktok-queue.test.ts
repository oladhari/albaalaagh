import { describe, expect, it } from 'vitest';
import { mergeTikTokQueue, parseTikTokQueueRow } from '../tiktok-queue';
const id = '14f089c4-b9f4-4a7b-9f27-7eea5d367d16';
const video = { id, title: 'Reel', description: null, video_url: 'https://media.albaalaagh.com/shorts/reel.mp4', published_at: '2026-11-02' };
describe('TikTok-only queue', () => {
  it('accepts public media but rejects private archives, foreign URLs and mismatched IDs', () => {
    const row = { key: 'tiktok_queue:' + id, value: JSON.stringify(video) };
    expect(parseTikTokQueueRow(row)).toEqual(video);
    expect(parseTikTokQueueRow({ ...row, key: 'tiktok_queue:other' })).toBeNull();
    expect(parseTikTokQueueRow({ ...row, value: JSON.stringify({ ...video, video_url: 'https://archive.example/clip.mp4' }) })).toBeNull();
  });
  it('deduplicates queue rows by both stable identity and media URL', () => {
    expect(mergeTikTokQueue([video], [video, { ...video, id: 'another-id' }])).toEqual([video]);
  });
});
