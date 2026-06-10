'use client';

import { useEffect, useState } from 'react';
import {
  Activity, DollarSign, Zap, Users, Clock, RefreshCw,
} from 'lucide-react';
import KPICard from '@/components/KPICard';
import { UsageAreaChart, UsageBarChart, UsageDonut } from '@/components/UsageChart';
import ProviderBadge from '@/components/ProviderBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { OverviewResponse, Provider } from '@/lib/types';

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
const fmtCost = (n: number) => `$${n.toFixed(2)}`;
const fmtMs   = (n: number) => `${Math.round(n)}ms`;

const PROVIDER_COLORS: Record<Provider, string> = {
  openai:    'var(--openai)',
  anthropic: 'var(--anthropic)',
  github:    'var(--github)',
  gemini:    'var(--gemini)',
};

export default function DashboardPage() {
  const [data, setData]       = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/usage/overview');
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetch('/api/providers/refresh', { method: 'POST' });
    await load();
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="page-container"><LoadingSpinner label="Loading overview…" /></div>;
  if (!data)   return <div className="page-container"><p style={{ color: 'var(--text-muted)' }}>Failed to load data.</p></div>;

  const { kpi, by_provider, top_models, recent_timeseries } = data;

  // Provider donut data
  const donutData = by_provider.map(p => ({
    name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
    value: p.request_count,
    color: PROVIDER_COLORS[p.provider],
  }));

  // Model bar data (top 6)
  const modelBarData = top_models.slice(0, 6).map(m => ({
    model: m.model_name.replace('claude-3-5-', 'c3.5-').replace('claude-3-', 'c3-').replace('-20241022','').replace('-20240229','').replace('-20240307',''),
    requests: m.request_count,
    cost: parseFloat(m.estimated_cost.toFixed(2)),
  }));

  // Time series display — show last 14 labels
  const tsDisplay = recent_timeseries.slice(-14).map(p => ({
    ...p,
    label: p.timestamp.slice(5), // MM-DD
    openai:    p.provider_breakdown['openai']    ?? 0,
    anthropic: p.provider_breakdown['anthropic'] ?? 0,
    github:    p.provider_breakdown['github']    ?? 0,
    gemini:    p.provider_breakdown['gemini']    ?? 0,
  }));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Overview</h1>
          <p className="page-subtitle">
            All providers · Last 30 days ·{' '}
            <span style={{ color: 'var(--accent-blue)' }}>
              {data.data_source === 'mock' ? 'Simulated data' : data.data_source === 'cached' ? 'Cached' : 'Live'}
            </span>
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={handleRefresh}
          disabled={refreshing}
          id="btn-refresh-overview"
        >
          <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} style={{ transition: 'transform 0.5s', transform: refreshing ? 'rotate(360deg)' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard label="Total Requests"  value={fmt(kpi.total_requests)}   icon={Activity}   changePct={kpi.requests_change_pct} delay={0}   color="linear-gradient(90deg,#6366f1,#8b5cf6)" iconBg="rgba(99,102,241,0.15)" />
        <KPICard label="Total Cost"      value={fmtCost(kpi.total_cost)}   icon={DollarSign} changePct={kpi.cost_change_pct}     delay={50}  color="linear-gradient(90deg,#10b981,#0ea5e9)" iconBg="rgba(16,185,129,0.15)" />
        <KPICard label="Tokens In"       value={fmt(kpi.total_tokens_input)}  icon={Zap}     delay={100} color="linear-gradient(90deg,#f59e0b,#ec4899)" iconBg="rgba(245,158,11,0.15)" />
        <KPICard label="Tokens Out"      value={fmt(kpi.total_tokens_output)} icon={Zap}     delay={150} color="linear-gradient(90deg,#0ea5e9,#6366f1)" iconBg="rgba(14,165,233,0.15)" />
        <KPICard label="Active Persons"  value={String(kpi.active_persons)}   icon={Users}   delay={200} color="linear-gradient(90deg,#8b5cf6,#ec4899)" iconBg="rgba(139,92,246,0.15)" />
        <KPICard label="Avg Latency"     value={fmtMs(kpi.avg_latency_ms)}    icon={Clock}   delay={250} color="linear-gradient(90deg,#ec4899,#f59e0b)" iconBg="rgba(236,72,153,0.15)" />
      </div>

      {/* Charts Row 1 */}
      <div className="chart-grid">
        {/* Provider breakdown */}
        <div className="chart-container fade-up fade-up-3">
          <div className="chart-title">Requests by Provider</div>
          <div className="chart-subtitle">Distribution across all providers</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <UsageDonut data={donutData} height={160} formatter={fmt} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {by_provider.map(p => (
                <div key={p.provider} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ProviderBadge provider={p.provider} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{fmt(p.request_count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Model usage */}
        <div className="chart-container fade-up fade-up-4">
          <div className="chart-title">Top Models by Requests</div>
          <div className="chart-subtitle">All providers combined</div>
          <UsageBarChart
            data={modelBarData}
            xKey="model"
            series={[{ key: 'requests', name: 'Requests', color: 'var(--accent-blue)' }]}
            height={180}
            formatter={v => fmt(v)}
          />
        </div>
      </div>

      {/* Timeseries */}
      <div className="chart-container fade-up" style={{ marginBottom: 24 }}>
        <div className="chart-title">Request Volume — Daily Trend</div>
        <div className="chart-subtitle">Broken down by provider · last 14 days</div>
        <UsageAreaChart
          data={tsDisplay}
          xKey="label"
          series={[
            { key: 'openai',    name: 'OpenAI',    color: 'var(--openai)' },
            { key: 'anthropic', name: 'Anthropic', color: 'var(--anthropic)' },
            { key: 'github',    name: 'GitHub',    color: 'var(--github)' },
            { key: 'gemini',    name: 'Gemini',    color: 'var(--gemini)' },
          ]}
          height={240}
          formatter={fmt}
        />
      </div>

      {/* Provider metrics table */}
      <div className="chart-container fade-up">
        <div className="chart-title" style={{ marginBottom: 16 }}>Provider Summary</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th style={{ textAlign: 'right' }}>Requests</th>
                <th style={{ textAlign: 'right' }}>Tokens In</th>
                <th style={{ textAlign: 'right' }}>Tokens Out</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
                <th style={{ textAlign: 'right' }}>Avg Latency</th>
                <th style={{ textAlign: 'right' }}>Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {by_provider.map(p => (
                <tr key={p.provider}>
                  <td><ProviderBadge provider={p.provider} /></td>
                  <td className="td-primary" style={{ textAlign: 'right' }}>{p.request_count.toLocaleString()}</td>
                  <td className="td-mono"    style={{ textAlign: 'right' }}>{fmt(p.tokens_input)}</td>
                  <td className="td-mono"    style={{ textAlign: 'right' }}>{fmt(p.tokens_output)}</td>
                  <td className="td-cost"    style={{ textAlign: 'right' }}>{fmtCost(p.estimated_cost)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtMs(p.avg_latency_ms)}</td>
                  <td style={{ textAlign: 'right', color: p.error_rate > 0.05 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {(p.error_rate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
