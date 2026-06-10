'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UsageAreaChart, UsageBarChart } from '@/components/UsageChart';
import type { TimeSeriesPoint, Granularity } from '@/lib/types';

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);
const fmtCost = (v: number) => `$${v.toFixed(2)}`;

export default function TimeSeriesPage() {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>('day');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/usage/timeseries?granularity=${granularity}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [granularity]);

  const displayData = data.map(p => ({
    ...p,
    label: granularity === 'hour' ? p.timestamp.slice(11, 16) :
           granularity === 'day' ? p.timestamp.slice(5) :
           p.timestamp,
    openai: p.provider_breakdown['openai'] ?? 0,
    anthropic: p.provider_breakdown['anthropic'] ?? 0,
    github: p.provider_breakdown['github'] ?? 0,
    gemini: p.provider_breakdown['gemini'] ?? 0,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Time Series Analysis</h1>
          <p className="page-subtitle">Historical trends across cost, volume, and tokens</p>
        </div>
        <div className="tab-list">
          <button className={`tab-btn ${granularity === 'hour' ? 'active' : ''}`} onClick={() => setGranularity('hour')}>Hourly</button>
          <button className={`tab-btn ${granularity === 'day' ? 'active' : ''}`} onClick={() => setGranularity('day')}>Daily</button>
          <button className={`tab-btn ${granularity === 'month' ? 'active' : ''}`} onClick={() => setGranularity('month')}>Monthly</button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label={`Loading ${granularity} data…`} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Provider stacked area */}
          <div className="chart-container fade-up">
            <div className="chart-title">Requests by Provider</div>
            <div className="chart-subtitle">Volume over time</div>
            <UsageAreaChart
              data={displayData}
              xKey="label"
              series={[
                { key: 'openai', name: 'OpenAI', color: 'var(--openai)' },
                { key: 'anthropic', name: 'Anthropic', color: 'var(--anthropic)' },
                { key: 'github', name: 'GitHub', color: 'var(--github)' },
                { key: 'gemini', name: 'Gemini', color: 'var(--gemini)' },
              ]}
              height={280}
              formatter={fmt}
            />
          </div>

          {/* Cost trend */}
          <div className="chart-container fade-up fade-up-1">
            <div className="chart-title">Estimated Cost</div>
            <div className="chart-subtitle">Spend trend (USD)</div>
            <UsageAreaChart
              data={displayData}
              xKey="label"
              series={[{ key: 'estimated_cost', name: 'Cost', color: 'var(--accent-green)' }]}
              height={240}
              formatter={fmtCost}
            />
          </div>

          {/* Tokens In vs Out */}
          <div className="chart-container fade-up fade-up-2">
            <div className="chart-title">Token Volume</div>
            <div className="chart-subtitle">Input vs Output tokens</div>
            <UsageBarChart
              data={displayData}
              xKey="label"
              series={[
                { key: 'tokens_input', name: 'Tokens In', color: 'var(--accent-blue)' },
                { key: 'tokens_output', name: 'Tokens Out', color: 'var(--accent-purple)' },
              ]}
              height={260}
              formatter={fmt}
            />
          </div>
        </div>
      )}
    </div>
  );
}
