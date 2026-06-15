'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Trash2, Plus, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import type { Provider, APIKeyConfig, IdentityMapping, Person } from '@/lib/types';
import ProviderBadge from '@/components/ProviderBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SettingsPage() {
  const [keys, setKeys] = useState<APIKeyConfig[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

  const [identities, setIdentities] = useState<{ mappings: IdentityMapping[], persons: Person[] } | null>(null);
  const [loadingId, setLoadingId] = useState(true);

  // New key form state
  const [formOpen, setFormOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('openai');
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Identity override form state
  const [overrideFormOpen, setOverrideFormOpen] = useState(false);
  const [overridePersonId, setOverridePersonId] = useState('');
  const [overrideProvider, setOverrideProvider] = useState<Provider>('openai');
  const [overrideAccountId, setOverrideAccountId] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  async function loadKeys() {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/config/keys');
      setKeys(await res.json());
    } finally {
      setLoadingKeys(false);
    }
  }

  async function loadIdentities() {
    setLoadingId(true);
    try {
      const res = await fetch('/api/identity');
      setIdentities(await res.json());
    } finally {
      setLoadingId(false);
    }
  }

  useEffect(() => {
    loadKeys();
    loadIdentities();
  }, []);

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName || !apiKey) {
      setError('Please fill all fields');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/config/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, display_name: displayName, api_key: apiKey }),
      });
      if (!res.ok) throw new Error('Failed to save key');
      await loadKeys();
      setFormOpen(false);
      setDisplayName('');
      setApiKey('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey(key_id: string) {
    if (!confirm('Delete this API key? Dashboard will stop fetching data for it.')) return;
    try {
      const res = await fetch(`/api/config/keys?key_id=${key_id}`, { method: 'DELETE' });
      if (res.ok) await loadKeys();
    } catch {
      alert('Failed to delete key');
    }
  }

  async function handleAddOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overridePersonId || !overrideAccountId) {
      setOverrideError('Please fill all fields');
      return;
    }
    setOverrideSaving(true);
    setOverrideError('');
    try {
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: overridePersonId,
          provider: overrideProvider,
          account_id: overrideAccountId,
        }),
      });
      if (!res.ok) throw new Error('Failed to save override');
      await loadIdentities();
      setOverrideFormOpen(false);
      setOverridePersonId('');
      setOverrideAccountId('');
    } catch (err: any) {
      setOverrideError(err.message);
    } finally {
      setOverrideSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage provider API keys and identity resolution</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
        
        {/* --- API KEYS SECTION --- */}
        <section className="settings-section">
          <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} color="var(--accent-blue)" /> Provider API Keys
          </div>
          <p className="settings-section-desc">
            Add API keys to fetch live usage data. Keys are stored locally on the server and never exposed to the client.
          </p>

          <div className="card" style={{ padding: 20 }}>
            {loadingKeys ? <LoadingSpinner /> : (
              <>
                {keys.length === 0 ? (
                  <div className="alert" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    No API keys configured. Using mock data.
                  </div>
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    {keys.map(k => (
                      <div key={k.key_id} className="key-row">
                        <div className="key-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="key-name">{k.display_name}</span>
                            <ProviderBadge provider={k.provider} />
                          </div>
                          <span className="key-mask">{k.api_key_masked}</span>
                        </div>
                        <div className="key-actions">
                          <button className="btn-icon" onClick={() => handleDeleteKey(k.key_id)} title="Delete key">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!formOpen ? (
                  <button className="btn-secondary" onClick={() => setFormOpen(true)} style={{ width: '100%', justifyContent: 'center' }}>
                    <Plus size={16} /> Add New Key
                  </button>
                ) : (
                  <form onSubmit={handleAddKey} style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div className="form-group">
                      <label className="form-label">Provider</label>
                      <select className="form-select" value={provider} onChange={e => setProvider(e.target.value as Provider)}>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="github">GitHub</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Display Name</label>
                      <input className="form-input" placeholder="e.g. Prod OpenAI Key" value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus />
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input className="form-input mono" type="password" placeholder="sk-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                    </div>
                    {error && <div className="alert error">{error}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                      <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Key'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => { setFormOpen(false); setError(''); }} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </section>

        {/* --- IDENTITY RESOLUTION SECTION --- */}
        <section className="settings-section">
          <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="var(--accent-purple)" /> Identity Resolution
          </div>
          <p className="settings-section-desc">
            Rules and mappings for linking multiple provider accounts (e.g. GitHub and OpenAI) to a single Person.
          </p>

          <div className="card" style={{ padding: 20 }}>
            {loadingId ? <LoadingSpinner /> : identities?.persons.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No persons resolved yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {identities?.persons.slice(0, 4).map(p => (
                  <div key={p.person_id} style={{ padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.display_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>
                      </div>
                      <div className="confidence-bar">
                        <LinkIcon size={12} color="var(--text-muted)" />
                        <span className="confidence-pct">95% match</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {p.accounts.map(a => (
                        <div key={a.account_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ProviderBadge provider={a.provider} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.display_name}</span>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{a.api_key_masked}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              {!overrideFormOpen ? (
                <button className="btn-secondary" onClick={() => setOverrideFormOpen(true)} style={{ width: '100%', justifyContent: 'center' }}>
                  <Plus size={16} /> Add Manual Override
                </button>
              ) : (
                <form onSubmit={handleAddOverride} style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="form-group">
                    <label className="form-label">Person ID / Display Name</label>
                    <input className="form-input" placeholder="e.g. John Doe" value={overridePersonId} onChange={e => setOverridePersonId(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Provider</label>
                    <select className="form-select" value={overrideProvider} onChange={e => setOverrideProvider(e.target.value as Provider)}>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="github">GitHub</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Provider Account ID</label>
                    <input className="form-input" placeholder="e.g. org-12345" value={overrideAccountId} onChange={e => setOverrideAccountId(e.target.value)} />
                  </div>
                  {overrideError && <div className="alert error">{overrideError}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button type="submit" className="btn-primary" disabled={overrideSaving}>
                      {overrideSaving ? 'Saving…' : 'Save Override'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => { setOverrideFormOpen(false); setOverrideError(''); }} disabled={overrideSaving}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
