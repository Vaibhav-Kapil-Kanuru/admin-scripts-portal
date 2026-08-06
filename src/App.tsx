import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BulkSignIn from './components/BulkSignIn';
import ContestJoin from './components/ContestJoin';
import MemeUpload from './components/MemeUpload';
import type { AuthResult, ModuleTab } from './types';
import { ENV_CONFIGS } from './constants';

function App() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('bulk-signin');
  const [signInResults, setSignInResults] = useState<AuthResult[]>([]);
  const [env, setEnv] = useState<'alpha' | 'dev'>('dev');

  const handleResultsUpdate = useCallback((results: AuthResult[]) => {
    setSignInResults(results);
  }, []);

  // Clear sign-in results when environment changes to avoid using old tokens
  useEffect(() => {
    setSignInResults([]);
  }, [env]);

  const currentEnvConfig = ENV_CONFIGS[env];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', gap: '0' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1400px', overflow: 'hidden' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            <h1
              className="gradient-text"
              style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}
            >
              LitzChill Admin Hub
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
                fontSize: '0.9rem',
              }}
            >
              {activeTab === 'bulk-signin'
                ? 'Bulk Account Authentication & Token Generation'
                : activeTab === 'contest-join'
                ? 'Bulk Contest Joining & Media Upload'
                : 'Bulk Standard Meme & Flash Card Upload'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Target Env:</span>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as 'alpha' | 'dev')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer',
                  paddingRight: '4px'
                }}
              >
                <option value="dev" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>DEV Environment</option>
                <option value="alpha" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>ALPHA Environment</option>
              </select>
            </div>
            <span className="badge badge-info animate-pulse-slow">
              Supabase {env === 'dev' ? 'Dev' : 'Alpha'} Mode
            </span>
            <span className="badge badge-neutral">v2.1.0</span>
          </div>
        </header>

        {/* Active Module */}
        <div style={{ minHeight: 'calc(100vh - 160px)' }}>
          {activeTab === 'bulk-signin' && (
            <BulkSignIn onResultsUpdate={handleResultsUpdate} currentEnvConfig={currentEnvConfig} />
          )}
          {activeTab === 'contest-join' && (
            <ContestJoin signInResults={signInResults} currentEnvConfig={currentEnvConfig} />
          )}
          {activeTab === 'meme-upload' && (
            <MemeUpload signInResults={signInResults} currentEnvConfig={currentEnvConfig} />
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: '48px',
            padding: '24px 0',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <p>© 2026 LitzChill Network Systems. Authorized Developer Admin Hub.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
