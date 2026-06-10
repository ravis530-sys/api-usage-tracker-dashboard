import { getActiveKeyForProvider } from '@/lib/configStore';

/**
 * Fetches usage data from Anthropic.
 */
export async function fetchAnthropicUsage(startDate: string, endDate: string) {
  const apiKey = getActiveKeyForProvider('anthropic');
  if (!apiKey) return null;

  try {
    // Note: Anthropic doesn't have a fully public usage API documented in the same way,
    // so we're stubbing what a call to it might look like.
    const res = await fetch(`https://api.anthropic.com/v1/organizations/usage?start=${startDate}&end=${endDate}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.warn(`Anthropic fetch failed with status ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Error fetching Anthropic usage:', err);
    return null;
  }
}
