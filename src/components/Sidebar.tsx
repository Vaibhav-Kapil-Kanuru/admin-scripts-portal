import React from 'react';
import {
  Users,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { ModuleTab } from '../types';

interface SidebarProps {
  activeTab: ModuleTab;
  onTabChange: (tab: ModuleTab) => void;
}

const NAV_ITEMS: { key: ModuleTab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: 'bulk-signin',
    label: 'Bulk Sign-In',
    icon: <Users size={20} />,
    description: 'Authenticate multiple users',
  },
  {
    key: 'contest-join',
    label: 'Contest Join',
    icon: <Trophy size={20} />,
    description: 'Bulk join ongoing contests',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className="glass-panel sidebar"
      style={{
        width: collapsed ? '64px' : '240px',
        minHeight: 'calc(100vh - 48px)',
        padding: collapsed ? '16px 8px' : '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease',
        position: 'sticky',
        top: '24px',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 6px 16px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '8px',
          minHeight: '42px',
        }}
      >
        <Zap size={22} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
        {!collapsed && (
          <span
            className="gradient-text"
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            Script Hub
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.1) 100%)'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(99,102,241,0.3)'
                  : '1px solid transparent',
                borderRadius: '10px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                width: '100%',
                boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.1)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <span
                style={{
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0,
                  transition: 'color 0.2s ease',
                }}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: isActive ? 600 : 400, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginTop: 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
};

export default Sidebar;
