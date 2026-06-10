import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Flush all usage caches to force re-fetch from providers
    const keys = await cache.keys('cache:*');
    for (const key of keys) await cache.del(key);
    return Response.json({ success: true, flushed: keys.length, message: 'Cache cleared. Next request will fetch fresh data.' });
  } catch {
    return Response.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
