'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  BarChart3,
  TrendingUp,
  Settings,
  Cpu,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    section: 'Analytics',
    items: [
      { href: '/dashboard',            label: 'Overview',     icon: LayoutDashboard },
      { href: '/dashboard/person',     label: 'Persons',      icon: Users },
      { href: '/dashboard/account',    label: 'Accounts',     icon: KeyRound },
      { href: '/dashboard/model',      label: 'Models',       icon: Cpu },
      { href: '/dashboard/timeseries', label: 'Time Series',  icon: TrendingUp },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/settings', label: 'Settings & Keys', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">
            <Zap size={18} color="#fff" />
          </div>
          <div className="logo-text">
            <span className="logo-title">API Analytics</span>
            <span className="logo-sub">Unified Platform</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {items.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} className="nav-icon" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer status */}
      <div className="sidebar-footer">
        <div className="data-source-badge">
          <div className="status-dot" />
          <span>Live · Mock Data</span>
        </div>
      </div>
    </aside>
  );
}
