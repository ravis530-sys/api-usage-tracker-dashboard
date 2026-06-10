'use client';

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

// ─── Shared custom tooltip ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-title">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="custom-tooltip-row">
          <span className="tooltip-dot" style={{ background: entry.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {formatter ? formatter(entry.value, entry.name) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

const AXIS_STYLE = {
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  axisLine: { stroke: 'transparent' },
  tickLine: { stroke: 'transparent' },
};

// ─── Area Chart ───────────────────────────────────────────────────────────────
interface AreaSeries { key: string; name: string; color: string; }

interface UsageAreaChartProps {
  data: any[];
  series: AreaSeries[];
  xKey: string;
  height?: number;
  formatter?: (v: number, name: string) => string;
}

export function UsageAreaChart({ data, series, xKey, height = 220, formatter }: UsageAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }} />}
        {series.map(s => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
interface BarSeries { key: string; name: string; color: string; }

interface UsageBarChartProps {
  data: any[];
  series: BarSeries[];
  xKey: string;
  height?: number;
  formatter?: (v: number, name: string) => string;
  horizontal?: boolean;
}

export function UsageBarChart({ data, series, xKey, height = 220, formatter, horizontal }: UsageBarChartProps) {
  const layout = horizontal ? 'vertical' : 'horizontal';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: 4, left: horizontal ? 60 : -16, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={!horizontal} vertical={horizontal} />
        {horizontal
          ? <><YAxis dataKey={xKey} type="category" {...AXIS_STYLE} width={80} /><XAxis type="number" {...AXIS_STYLE} /></>
          : <><XAxis dataKey={xKey} {...AXIS_STYLE} /><YAxis {...AXIS_STYLE} /></>
        }
        <Tooltip content={<CustomTooltip formatter={formatter} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }} />}
        {series.map(s => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Donut / Pie Chart ────────────────────────────────────────────────────────
interface DonutDataPoint { name: string; value: number; color: string; }

interface UsageDonutProps {
  data: DonutDataPoint[];
  height?: number;
  formatter?: (v: number) => string;
}

export function UsageDonut({ data, height = 200, formatter }: UsageDonutProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="75%"
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0];
            return (
              <div className="custom-tooltip">
                <div className="custom-tooltip-row">
                  <span className="tooltip-dot" style={{ background: d.payload.color }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.name}</span>
                </div>
                <div style={{ color: 'var(--accent-blue)', fontWeight: 700, marginTop: 4 }}>
                  {formatter ? formatter(d.value) : d.value.toLocaleString()}
                </div>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
