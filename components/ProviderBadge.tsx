'use client';

import type { Provider } from '@/lib/types';

const PROVIDER_META: Record<Provider, { label: string; dot: string }> = {
  openai:    { label: 'OpenAI',    dot: 'var(--openai)' },
  anthropic: { label: 'Anthropic', dot: 'var(--anthropic)' },
  github:    { label: 'GitHub',    dot: 'var(--github)' },
  gemini:    { label: 'Gemini',    dot: 'var(--gemini)' },
};

export default function ProviderBadge({ provider }: { provider: Provider }) {
  const meta = PROVIDER_META[provider];
  return (
    <span className={`provider-badge ${provider}`}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: meta.dot, display: 'inline-block', flexShrink: 0,
      }} />
      {meta.label}
    </span>
  );
}
