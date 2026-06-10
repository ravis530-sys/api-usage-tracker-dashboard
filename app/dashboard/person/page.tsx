'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, Zap, Activity } from 'lucide-react';
import ProviderBadge from '@/components/ProviderBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UsageDonut, UsageBarChart } from '@/components/UsageChart';
import type { PersonMetrics, Provider } from '@/lib/types';

const fmt     = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);
const fmtCost = (n: number) => `$${n.toFixed(2)}`;

const PROVIDER_COLORS: Record<Provider, string> = {
  openai: 'var(--openai)', anthropic: 'var(--anthropic)', github: 'var(--github)',
};
const MODEL_COLORS = ['#6366f1','#8b5cf6','#0ea5e9','#10b981','#f59e0b','#ec4899','#ef4444','#a78bfa'];

export default function PersonPage() {
  const [persons, setPersons] = useState<PersonMetrics[]>([]);
  const [selected, setSelected] = useState<PersonMetrics | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/usage/person')
      .then(r => r.json())
      .then((data: PersonMetrics[]) => {
        setPersons(data);
        if (data.length) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><LoadingSpinner label="Loading persons…" /></div>;

  const donutData = selected?.model_distribution
    .slice(0, 6)
    .map((m, i) => ({ name: m.model_name.split('-').slice(0, 2).join('-'), value: m.count, color: MODEL_COLORS[i % MODEL_COLORS.length] })) ?? [];

  const barData = persons.slice(0, 8).map(p => ({
    name: p.display_name.split(' ')[0],
    cost: parseFloat(p.estimated_cost.toFixed(2)),
    requests: p.request_count,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Person View</h1>
          <p className="page-subtitle">Cross-provider usage per identity · {persons.length} persons tracked</p>
        </div>
      </div>

      {/* Summary bar cards */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Persons',   value: String(persons.length),                        icon: Users,       color: 'linear-gradient(90deg,#6366f1,#8b5cf6)', iconBg: 'rgba(99,102,241,0.15)'  },
          { label: 'Total Cost',      value: fmtCost(persons.reduce((s,p)=>s+p.estimated_cost,0)), icon: DollarSign, color: 'linear-gradient(90deg,#10b981,#0ea5e9)', iconBg: 'rgba(16,185,129,0.15)'  },
          { label: 'Total Tokens In', value: fmt(persons.reduce((s,p)=>s+p.tokens_input,0)), icon: Zap,        color: 'linear-gradient(90deg,#f59e0b,#ec4899)', iconBg: 'rgba(245,158,11,0.15)'  },
          { label: 'Total Requests',  value: fmt(persons.reduce((s,p)=>s+p.request_count,0)),icon: Activity,   color: 'linear-gradient(90deg,#0ea5e9,#6366f1)', iconBg: 'rgba(14,165,233,0.15)'  },
        ].map(({ label, value, icon: Icon, color, iconBg }, idx) => (
          <div key={label} className="kpi-card fade-up" style={{ animationDelay: `${idx*50}ms`, ['--kpi-color' as string]: color, ['--kpi-icon-bg' as string]: iconBg }}>
            <div className="kpi-icon-wrap"><Icon size={18} color="#6366f1" /></div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        {/* Person list */}
        <div className="chart-container fade-up">
          <div className="chart-title">All Persons</div>
          <div className="chart-subtitle">Click to drill down</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {persons.map(p => (
              <button
                key={p.person_id}
                onClick={() => setSelected(p)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', border: `1px solid ${selected?.person_id === p.person_id ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', background: selected?.person_id === p.person_id ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.display_name}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.providers.map(pr => <ProviderBadge key={pr} provider={pr} />)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-green)' }}>{fmtCost(p.estimated_cost)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.request_count.toLocaleString()} reqs</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected person detail */}
        <div className="chart-container fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selected ? (
            <>
              <div>
                <div className="chart-title">{selected.display_name}</div>
                <div className="chart-subtitle">Model usage distribution</div>
                <UsageDonut data={donutData} height={160} formatter={fmt} />
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                  {donutData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" />

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Total Cost',     value: fmtCost(selected.estimated_cost) },
                  { label: 'Requests',       value: selected.request_count.toLocaleString() },
                  { label: 'Tokens In',      value: fmt(selected.tokens_input) },
                  { label: 'Tokens Out',     value: fmt(selected.tokens_output) },
                ].map(s => (
                  <div key={s.label} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active Providers</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.providers.map(pr => <ProviderBadge key={pr} provider={pr} />)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>Select a person</div>
          )}
        </div>
      </div>

      {/* Cost comparison bar chart */}
      <div className="chart-container fade-up" style={{ marginTop: 20 }}>
        <div className="chart-title">Cost Comparison — Top 8 Persons</div>
        <div className="chart-subtitle">Estimated spend over 30 days</div>
        <UsageBarChart
          data={barData}
          xKey="name"
          series={[{ key: 'cost', name: 'Cost (USD)', color: 'var(--accent-green)' }]}
          height={200}
          formatter={v => `$${v.toFixed(2)}`}
        />
      </div>
    </div>
  );
}
