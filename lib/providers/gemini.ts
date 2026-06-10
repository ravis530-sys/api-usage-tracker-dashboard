import { getActiveKeyForProvider } from '@/lib/configStore';

/**
 * Fetches usage data from Google Gemini.
 * NOTE: Google doesn't currently provide a direct REST endpoint for aggregated project usage 
 * in the same way OpenAI does, but we stub this client for the unified dashboard. 
 */
export async function fetchGeminiUsage(startDate: string, endDate: string) {
  const apiKey = getActiveKeyForProvider('gemini');
  if (!apiKey) return null;

  try {
    // Stub endpoint for Google Gemini API usage fetching
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/usage?key=${apiKey}&start=${startDate}&end=${endDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.warn(`Gemini fetch failed with status ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Error fetching Gemini usage:', err);
    return null;
  }
}
