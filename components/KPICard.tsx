'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  changePct?: number;
  icon: LucideIcon;
  color?: string;
  iconBg?: string;
  delay?: number;
}

export default function KPICard({
  label, value, changePct, icon: Icon, color, iconBg, delay = 0,
}: KPICardProps) {
  const isUp   = changePct !== undefined && changePct > 0;
  const isDown = changePct !== undefined && changePct < 0;

  return (
    <div
      className={`kpi-card fade-up`}
      style={{
        animationDelay: `${delay}ms`,
        ['--kpi-color' as string]: color ?? 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
        ['--kpi-icon-bg' as string]: iconBg ?? 'rgba(99,102,241,0.15)',
      }}
    >
      <div className="kpi-icon-wrap">
        <Icon size={18} color={color?.includes('var') ? 'var(--accent-blue)' : '#6366f1'} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {changePct !== undefined && (
        <span className={`kpi-change ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
          {isUp   && <TrendingUp size={10} />}
          {isDown && <TrendingDown size={10} />}
          {!isUp && !isDown && <Minus size={10} />}
          {Math.abs(changePct).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
