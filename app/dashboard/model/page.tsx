'use client';

import { useEffect, useState } from 'react';
import { Cpu, DollarSign, Zap, Clock } from 'lucide-react';
import ProviderBadge from '@/components/ProviderBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UsageBarChart, UsageDonut } from '@/components/UsageChart';
import type { ModelMetrics, Provider } from '@/lib/types';

const fmt     = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);
const fmtCost = (n: number) => `$${n.toFixed(4)}`;

const MODEL_COLORS = [
  '#6366f1','#10b981','#f59e0b','#0ea5e9','#8b5cf6','#ec4899','#ef4444','#a78bfa','#14b8a6','#f97316',
];

export default function ModelPage() {
  const [models, setModels] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage/model')
      .then(r => r.json())
      .then(setModels)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><LoadingSpinner label="Loading models…" /></div>;

  const top8 = models.slice(0, 8);

  const barReqs = top8.map((m, i) => ({
    model: m.model_name.replace('claude-3-5-','c3.5-').replace('claude-3-','c3-').replace('-20241022','').replace('-20240229','').replace('-20240307','').replace('text-embedding-3-small','embed-small'),
    requests: m.request_count,
    latency: m.avg_latency_ms,
    color: MODEL_COLORS[i % MODEL_COLORS.length],
  }));

  const donutData = top8.map((m, i) => ({
    name: m.model_name.split('-').slice(0, 2).join('-'),
    value: m.estimated_cost,
    color: MODEL_COLORS[i % MODEL_COLORS.length],
  }));

  const totalCost = models.reduce((s, m) => s + m.estimated_cost, 0);
  const totalReqs = models.reduce((s, m) => s + m.request_count, 0);
  const totalTok  = models.reduce((s, m) => s + m.tokens_input + m.tokens_output, 0);
  const avgLat    = models.reduce((s, m) => s + m.avg_latency_ms, 0) / (models.length || 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Model View</h1>
          <p className="page-subtitle">GPT vs Claude vs Copilot — cost, usage, and latency · {models.length} models</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { label: 'Models Active',  value: String(models.length), icon: Cpu,        color: 'linear-gradient(90deg,#6366f1,#8b5cf6)', iconBg: 'rgba(99,102,241,0.15)' },
          { label: 'Total Cost',     value: `$${totalCost.toFixed(2)}`,icon: DollarSign,color:'linear-gradient(90deg,#10b981,#0ea5e9)', iconBg: 'rgba(16,185,129,0.15)' },
          { label: 'Total Tokens',   value: fmt(totalTok),         icon: Zap,        color: 'linear-gradient(90deg,#f59e0b,#ec4899)', iconBg: 'rgba(245,158,11,0.15)' },
          { label: 'Avg Latency',    value: `${Math.round(avgLat)}ms`, icon: Clock,  color: 'linear-gradient(90deg,#ec4899,#f59e0b)', iconBg: 'rgba(236,72,153,0.15)' },
        ].map(({ label, value, icon: Icon, color, iconBg }, idx) => (
          <div key={label} className="kpi-card fade-up" style={{ animationDelay: `${idx*50}ms`, ['--kpi-color' as string]: color, ['--kpi-icon-bg' as string]: iconBg }}>
            <div className="kpi-icon-wrap"><Icon size={18} color="#6366f1" /></div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid" style={{ marginBottom: 24 }}>
        {/* Requests by model */}
        <div className="chart-container fade-up">
          <div className="chart-title">Requests by Model</div>
          <div className="chart-subtitle">Top 8 models by request volume</div>
          <UsageBarChart
            data={barReqs}
            xKey="model"
            series={[{ key: 'requests', name: 'Requests', color: 'var(--accent-blue)' }]}
            height={200}
            formatter={v => fmt(v)}
          />
        </div>

        {/* Cost distribution donut */}
        <div className="chart-container fade-up">
          <div className="chart-title">Cost Distribution</div>
          <div className="chart-subtitle">Total spend by model</div>
          <UsageDonut data={donutData} height={160} formatter={v => `$${v.toFixed(2)}`} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latency comparison */}
      <div className="chart-container fade-up" style={{ marginBottom: 24 }}>
        <div className="chart-title">Average Latency by Model</div>
        <div className="chart-subtitle">Milliseconds per request</div>
        <UsageBarChart
          data={barReqs}
          xKey="model"
          series={[{ key: 'latency', name: 'Avg Latency (ms)', color: 'var(--accent-amber)' }]}
          height={180}
          formatter={v => `${v}ms`}
        />
      </div>

      {/* Model table */}
      <div className="chart-container fade-up">
        <div className="chart-title" style={{ marginBottom: 16 }}>Model Breakdown</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th style={{ textAlign: 'right' }}>Requests</th>
                <th style={{ textAlign: 'right' }}>Tokens In</th>
                <th style={{ textAlign: 'right' }}>Tokens Out</th>
                <th style={{ textAlign: 'right' }}>Total Cost</th>
                <th style={{ textAlign: 'right' }}>Cost/1K tok</th>
                <th style={{ textAlign: 'right' }}>Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={m.model_name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: MODEL_COLORS[i % MODEL_COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                      <span className="td-primary td-mono" style={{ fontSize: 12 }}>{m.model_name}</span>
                    </div>
                  </td>
                  <td><ProviderBadge provider={m.provider} /></td>
                  <td className="td-primary" style={{ textAlign: 'right' }}>{m.request_count.toLocaleString()}</td>
                  <td className="td-mono"    style={{ textAlign: 'right' }}>{fmt(m.tokens_input)}</td>
                  <td className="td-mono"    style={{ textAlign: 'right' }}>{fmt(m.tokens_output)}</td>
                  <td className="td-cost"    style={{ textAlign: 'right' }}>${m.estimated_cost.toFixed(2)}</td>
                  <td className="td-mono"    style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 12 }}>${m.cost_per_1k_tokens.toFixed(4)}</td>
                  <td style={{ textAlign: 'right', color: m.avg_latency_ms > 2000 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                    {m.avg_latency_ms}ms
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
