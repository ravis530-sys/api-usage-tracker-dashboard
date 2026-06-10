import type { NextRequest } from 'next/server';
import { cache, TTL } from '@/lib/cache';
import { fetchAllLiveEvents } from '@/lib/liveFetcher';
import { aggregateTimeseries } from '@/lib/aggregator';
import type { Granularity } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const granularity = (searchParams.get('granularity') ?? 'day') as Granularity;
    const cacheKey = `cache:timeseries:${granularity}`;

    const cached = await cache.get<object>(cacheKey);
    if (cached) return Response.json(cached);

    const liveEvents = await fetchAllLiveEvents();
    const data = aggregateTimeseries(liveEvents, granularity);
    
    await cache.set(cacheKey, data, TTL.TIMESERIES);
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Failed to fetch timeseries' }, { status: 500 });
  }
}
