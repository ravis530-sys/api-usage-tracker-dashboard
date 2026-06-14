import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import type { APIKeyConfig, APIKeyInput, Provider } from './types';

const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const CONFIG_DIR  = IS_PROD ? os.tmpdir() : path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'keys.json');

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function maskKey(key: string): string {
  if (key.length <= 8) return '***';
  return key.slice(0, 6) + '***...' + key.slice(-4);
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function readKeys(): APIKeyConfig[] {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as APIKeyConfig[];
  } catch {
    return [];
  }
}

export function saveKeys(keys: APIKeyConfig[]): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(keys, null, 2), 'utf-8');
}

export function addKey(input: APIKeyInput): APIKeyConfig {
  const keys = readKeys();
  const newKey: APIKeyConfig = {
    key_id:        `key-${Date.now()}`,
    provider:      input.provider,
    display_name:  input.display_name,
    api_key:       input.api_key,
    api_key_masked: maskKey(input.api_key),
    created_at:    new Date().toISOString(),
    is_active:     true,
  };
  keys.push(newKey);
  saveKeys(keys);
  return newKey;
}

export function deleteKey(key_id: string): boolean {
  const keys = readKeys();
  const idx = keys.findIndex(k => k.key_id === key_id);
  if (idx === -1) return false;
  keys.splice(idx, 1);
  saveKeys(keys);
  return true;
}

export function getActiveKeyForProvider(provider: Provider): string | null {
  const keys = readKeys();
  const key = keys.find(k => k.provider === provider && k.is_active);
  return key?.api_key ?? null;
}

/** Returns keys with api_key redacted for client responses */
export function getPublicKeys(): Omit<APIKeyConfig, 'api_key'>[] {
  return readKeys().map(({ api_key: _omit, ...rest }) => rest);
}
