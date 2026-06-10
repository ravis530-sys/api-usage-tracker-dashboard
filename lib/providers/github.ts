import { getActiveKeyForProvider } from '@/lib/configStore';

/**
 * Fetches Copilot usage data from GitHub.
 * Requires a GitHub Fine-grained PAT with 'Copilot for Business' permissions,
 * and an Organization name to fetch from.
 * Note: the configStore currently stores a single key. For GitHub, we might need an Org name, 
 * but we can hardcode or extract it if the user encodes it as `org:pat` in the key field.
 */
export async function fetchGitHubUsage(orgName: string) {
  const apiKey = getActiveKeyForProvider('github');
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.github.com/orgs/${orgName}/copilot/usage`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${apiKey}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.warn(`GitHub fetch failed with status ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Error fetching GitHub usage:', err);
    return null;
  }
}
