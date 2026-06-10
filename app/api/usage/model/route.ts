import type { NextRequest } from 'next/server';
import { cache, TTL } from '@/lib/cache';
import { fetchAllLiveEvents } from '@/lib/liveFetcher';
import { aggregateModels } from '@/lib/aggregator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cached = await cache.get<object>('cache:models');
    if (cached) return Response.json(cached);
    
    const liveEvents = await fetchAllLiveEvents();
    const models = aggregateModels(liveEvents);
    
    await cache.set('cache:models', models, TTL.MODEL);
    return Response.json(models);
  } catch {
    return Response.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
