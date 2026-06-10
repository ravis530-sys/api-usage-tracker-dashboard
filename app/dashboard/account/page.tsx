'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Activity, DollarSign, Zap } from 'lucide-react';
import ProviderBadge from '@/components/ProviderBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UsageBarChart } from '@/components/UsageChart';
import type { AccountMetrics } from '@/lib/types';

const fmt     = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);
const fmtCost = (n: number) => `$${n.toFixed(2)}`;

function RateGauge({ label, pct }: { label: string; pct: number }) {
  const isWarn = pct > 60;
  return (
    <div className="gauge-row">
      <div className="gauge-label">{label}</div>
      <div className="gauge-track" style={{ flex: 2 }}>
        <div className={`gauge-fill ${isWarn ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="gauge-value" style={{ color: isWarn ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

export default function AccountPage() {
  const [accounts, setAccounts] = useState<AccountMetrics[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/usage/account')
      .then(r => r.json())
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><LoadingSpinner label="Loading accounts…" /></div>;

  const barData = accounts.slice(0, 8).map(a => ({
    name: a.display_name.split(' ')[0],
    requests: a.request_count,
    cost: parseFloat(a.estimated_cost.toFixed(2)),
  }));

  const totalCost = accounts.reduce((s, a) => s + a.estimated_cost, 0);
  const totalReqs = accounts.reduce((s, a) => s + a.request_count, 0);
  const totalIn   = accounts.reduce((s, a) => s + a.tokens_input, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account View</h1>
          <p className="page-subtitle">Per-account usage, API keys, and rate limit monitoring · {accounts.length} accounts</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-grid">
        {[
          { label: 'Total Accounts', value: String(accounts.length),   icon: KeyRound,   color: 'linear-gradient(90deg,#6366f1,#8b5cf6)', iconBg: 'rgba(99,102,241,0.15)' },
          { label: 'Total Requests', value: fmt(totalReqs),            icon: Activity,   color: 'linear-gradient(90deg,#0ea5e9,#6366f1)', iconBg: 'rgba(14,165,233,0.15)' },
          { label: 'Total Cost',     value: fmtCost(totalCost),        icon: DollarSign, color: 'linear-gradient(90deg,#10b981,#0ea5e9)', iconBg: 'rgba(16,185,129,0.15)' },
          { label: 'Tokens In',      value: fmt(totalIn),              icon: Zap,        color: 'linear-gradient(90deg,#f59e0b,#ec4899)', iconBg: 'rgba(245,158,11,0.15)' },
        ].map(({ label, value, icon: Icon, color, iconBg }, idx) => (
          <div key={label} className="kpi-card fade-up" style={{ animationDelay: `${idx*50}ms`, ['--kpi-color' as string]: color, ['--kpi-icon-bg' as string]: iconBg }}>
            <div className="kpi-icon-wrap"><Icon size={18} color="#6366f1" /></div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-container fade-up">
          <div className="chart-title">Requests by Account</div>
          <div className="chart-subtitle">Top 8 accounts</div>
          <UsageBarChart
            data={barData}
            xKey="name"
            series={[{ key: 'requests', name: 'Requests', color: 'var(--accent-blue)' }]}
            height={200}
            formatter={v => fmt(v)}
          />
        </div>

        <div className="chart-container fade-up">
          <div className="chart-title">Rate Limit Usage</div>
          <div className="chart-subtitle">Current period utilisation</div>
          <div style={{ marginTop: 12 }}>
            {accounts.slice(0, 8).map(a => (
              <RateGauge key={a.account_id} label={a.display_name} pct={a.rate_limit_used_pct} />
            ))}
          </div>
        </div>
      </div>

      {/* Account table */}
      <div className="chart-container fade-up">
        <div className="chart-title" style={{ marginBottom: 16 }}>Account Details</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Provider</th>
                <th>API Key</th>
                <th style={{ textAlign: 'right' }}>Requests</th>
                <th style={{ textAlign: 'right' }}>Tokens In</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
                <th style={{ textAlign: 'right' }}>Rate Limit</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.account_id}>
                  <td className="td-primary">{a.display_name}</td>
                  <td><ProviderBadge provider={a.provider} /></td>
                  <td className="td-mono text-muted">{a.api_key_masked}</td>
                  <td className="td-primary" style={{ textAlign: 'right' }}>{a.request_count.toLocaleString()}</td>
                  <td className="td-mono"    style={{ textAlign: 'right' }}>{fmt(a.tokens_input)}</td>
                  <td className="td-cost"    style={{ textAlign: 'right' }}>{fmtCost(a.estimated_cost)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: a.rate_limit_used_pct > 60 ? 'var(--accent-amber)' : 'var(--accent-green)', fontWeight: 600, fontSize: 12 }}>
                      {a.rate_limit_used_pct.toFixed(0)}%
                    </span>
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
