import type { NextRequest } from 'next/server';
import { cache, TTL } from '@/lib/cache';
import { fetchAllLiveEvents } from '@/lib/liveFetcher';
import { aggregateEventsForOverview } from '@/lib/aggregator';
import { readKeys } from '@/lib/configStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cached = await cache.get<object>('cache:overview');
    if (cached) return Response.json({ ...cached, data_source: 'cached' });

    const keys = readKeys();
    const hasOpenAI    = keys.some(k => k.provider === 'openai' && k.is_active);
    const hasAnthropic = keys.some(k => k.provider === 'anthropic' && k.is_active);
    const hasGitHub    = keys.some(k => k.provider === 'github' && k.is_active);
    const hasGemini    = keys.some(k => k.provider === 'gemini' && k.is_active);

    const liveEvents = await fetchAllLiveEvents();
    
    // No mock fallback!
    const overview = aggregateEventsForOverview(liveEvents, 'live');
    
    const result = {
      ...overview,
      has_keys: { openai: hasOpenAI, anthropic: hasAnthropic, github: hasGitHub, gemini: hasGemini },
    };

    await cache.set('cache:overview', result, TTL.OVERVIEW);
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}
