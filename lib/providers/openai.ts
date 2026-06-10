import { v4 as uuidv4 } from 'uuid';
import { getActiveKeyForProvider } from '@/lib/configStore';

/**
 * Fetches usage data from OpenAI.
 * Note: OpenAI's official usage API is often restricted or undocumented.
 * This client attempts a fetch, and returns raw data if successful.
 */
export async function fetchOpenAIUsage(startDate: string, endDate: string) {
  const apiKey = getActiveKeyForProvider('openai');
  if (!apiKey) return null;

  try {
    // Attempting to use the organization usage endpoint
    const res = await fetch(`https://api.openai.com/v1/organization/usage/completions?start_time=${Math.floor(new Date(startDate).getTime() / 1000)}&end_time=${Math.floor(new Date(endDate).getTime() / 1000)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.warn(`OpenAI fetch failed with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error fetching OpenAI usage:', err);
    return null;
  }
}
