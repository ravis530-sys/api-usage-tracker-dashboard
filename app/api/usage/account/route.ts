import type { NextRequest } from 'next/server';
import { cache, TTL } from '@/lib/cache';
import { fetchAllLiveEvents } from '@/lib/liveFetcher';
import { aggregateAccounts } from '@/lib/aggregator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cached = await cache.get<object>('cache:accounts');
    if (cached) return Response.json(cached);
    
    const liveEvents = await fetchAllLiveEvents();
    const accounts = aggregateAccounts(liveEvents);
    
    await cache.set('cache:accounts', accounts, TTL.ACCOUNT);
    return Response.json(accounts);
  } catch {
    return Response.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
