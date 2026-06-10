import type { NextRequest } from 'next/server';
import { addKey, deleteKey, getPublicKeys } from '@/lib/configStore';
import { cache } from '@/lib/cache';
import type { APIKeyInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(getPublicKeys());
  } catch {
    return Response.json({ error: 'Failed to read keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as APIKeyInput;
    if (!body.provider || !body.api_key || !body.display_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const newKey = addKey(body);
    // Bust overview cache so next fetch uses new key info
    await cache.del('cache:overview');
    const { api_key: _omit, ...publicKey } = newKey;
    return Response.json(publicKey, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to save key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const key_id = searchParams.get('key_id');
    if (!key_id) return Response.json({ error: 'key_id required' }, { status: 400 });
    const ok = deleteKey(key_id);
    if (!ok) return Response.json({ error: 'Key not found' }, { status: 404 });
    await cache.del('cache:overview');
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to delete key' }, { status: 500 });
  }
}
