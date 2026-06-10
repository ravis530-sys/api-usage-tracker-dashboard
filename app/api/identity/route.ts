import type { NextRequest } from 'next/server';
import { readKeys } from '@/lib/configStore';
import { v4 as uuidv4 } from 'uuid';
import type { IdentityMapping, Person, ProviderAccount } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const keys = readKeys();
    const mappings: IdentityMapping[] = [];
    const persons: Person[] = [];

    if (keys.length > 0) {
      // In a purely live system with no mock data, we generate one global 
      // user for the live keys (unless we have actual user metadata from the APIs).
      const liveAccounts: ProviderAccount[] = keys.map(k => ({
        account_id: `acc-${k.key_id}`,
        provider: k.provider,
        display_name: k.display_name,
        api_key_id: k.key_id,
        api_key_masked: k.api_key_masked,
      }));

      persons.push({
        person_id: 'person-live-1',
        display_name: 'Live User',
        email: 'live.user@example.com',
        accounts: liveAccounts,
      });

      keys.forEach(k => {
        mappings.push({
          mapping_id: uuidv4(),
          person_id: 'person-live-1',
          provider: k.provider,
          account_id: `acc-${k.key_id}`,
          api_key_id: k.key_id,
          identity_value: 'live.user@example.com',
          confidence_score: 1.0,
          source_of_truth: 'system',
          created_at: k.created_at,
        });
      });
    }

    return Response.json({ mappings, persons });
  } catch {
    return Response.json({ error: 'Failed to fetch identity data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return Response.json({ success: true, override: body });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
