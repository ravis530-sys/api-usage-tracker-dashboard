import type { NextRequest } from 'next/server';
import { cache, TTL } from '@/lib/cache';
import { fetchAllLiveEvents } from '@/lib/liveFetcher';
import { aggregatePersons } from '@/lib/aggregator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cached = await cache.get<object>('cache:persons');
    if (cached) return Response.json(cached);
    
    const liveEvents = await fetchAllLiveEvents();
    const persons = aggregatePersons(liveEvents);
    
    await cache.set('cache:persons', persons, TTL.PERSON);
    return Response.json(persons);
  } catch {
    return Response.json({ error: 'Failed to fetch persons' }, { status: 500 });
  }
}
