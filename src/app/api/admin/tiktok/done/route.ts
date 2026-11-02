import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseTikTokQueueRow, TIKTOK_QUEUE_PREFIX } from '@/lib/tiktok-queue';

const prefix = 'tiktok_done:';
const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const ids: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from('site_settings').select('key')
      .like('key', `${prefix}%`).order('key').range(offset, offset + 999);
    if (error) return NextResponse.json({ error: 'Could not read TikTok marks' }, { status: 500 });
    ids.push(...(data || []).map(row => row.key.slice(prefix.length)));
    if (!data || data.length < 1000) break;
  }
  return NextResponse.json({ ids }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(validId) || typeof body?.done !== 'boolean') return NextResponse.json({ error: 'Invalid marks' }, { status: 400 });
  if (!ids.length) return NextResponse.json({ ok: true });
  const { data: rows, error: lookupError } = await supabaseAdmin.from('site_videos').select('id').in('id', ids).eq('video_type', 'short').eq('published', true);
  if (lookupError) return NextResponse.json({ error: 'Could not validate Short IDs' }, { status: 500 });
  const known = new Set((rows || []).map(row => row.id));
  const missing = [...new Set(ids)].filter(id => !known.has(id));
  if (missing.length) {
    const { data: queued, error } = await supabaseAdmin.from('site_settings').select('key, value')
      .in('key', missing.map(id => `${TIKTOK_QUEUE_PREFIX}${id}`));
    if (error) return NextResponse.json({ error: 'Could not validate queue IDs' }, { status: 500 });
    for (const row of queued || []) {
      const video = parseTikTokQueueRow(row);
      if (video) known.add(video.id);
    }
  }
  if (known.size !== new Set(ids).size) return NextResponse.json({ error: 'Unknown Short IDs' }, { status: 400 });
  if (body.done) {
    // Ignore existing rows so migration of browser marks preserves Buffer receipts.
    const { error } = await supabaseAdmin.from('site_settings').upsert([...new Set(ids)].map(id => ({ key: `${prefix}${id}`, value: JSON.stringify({ site_id: id, state: 'sent', source: 'manual', updated_at: new Date().toISOString() }) })), { onConflict: 'key', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: 'Could not save marks' }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin.from('site_settings').delete().in('key', ids.map(id => `${prefix}${id}`));
    if (error) return NextResponse.json({ error: 'Could not remove marks' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
