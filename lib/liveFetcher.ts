import { readKeys } from '@/lib/configStore';
import { fetchOpenAIUsage } from '@/lib/providers/openai';
import { fetchAnthropicUsage } from '@/lib/providers/anthropic';
import { fetchGitHubUsage } from '@/lib/providers/github';
import { normalizeOpenAI, normalizeAnthropic, normalizeGitHub } from '@/lib/normalizer';
import type { APIUsageEvent } from '@/lib/types';
import { subDays } from 'date-fns';

/**
 * Fetches data from all configured live providers in parallel,
 * normalizes it, and returns a unified array of APIUsageEvents.
 */
export async function fetchAllLiveEvents(): Promise<APIUsageEvent[]> {
  const endDate = new Date().toISOString();
  const startDate = subDays(new Date(), 30).toISOString();
  
  const liveEvents: APIUsageEvent[] = [];
  const keys = readKeys();
  const fetches = [];
  
  const oaiKey = keys.find(k => k.provider === 'openai' && k.is_active);
  if (oaiKey) {
    fetches.push(
      fetchOpenAIUsage(startDate, endDate).then(payload => {
        if (payload) {
          const normalized = normalizeOpenAI(payload, `acc-${oaiKey.key_id}`, 'person-live-1', oaiKey.key_id);
          liveEvents.push(...normalized);
        }
      }).catch(err => console.error('OpenAI fetch error:', err))
    );
  }
  
  const antKey = keys.find(k => k.provider === 'anthropic' && k.is_active);
  if (antKey) {
    fetches.push(
      fetchAnthropicUsage(startDate, endDate).then(payload => {
        if (payload) {
          const normalized = normalizeAnthropic(payload, `acc-${antKey.key_id}`, 'person-live-1', antKey.key_id);
          liveEvents.push(...normalized);
        }
      }).catch(err => console.error('Anthropic fetch error:', err))
    );
  }
  
  const ghKey = keys.find(k => k.provider === 'github' && k.is_active);
  if (ghKey) {
    fetches.push(
      // Hardcoding an org name "my-org" for now, or could parse from displayName if encoded
      fetchGitHubUsage('my-org').then(payload => {
        if (payload) {
          const normalized = normalizeGitHub(payload, `acc-${ghKey.key_id}`, 'person-live-1', ghKey.key_id);
          liveEvents.push(...normalized);
        }
      }).catch(err => console.error('GitHub fetch error:', err))
    );
  }
  
  await Promise.allSettled(fetches);
  
  // Sort events chronologically
  return liveEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
