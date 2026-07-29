import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import BulkSignIn from './components/BulkSignIn';
import ContestJoin from './components/ContestJoin';
import type { AuthResult, ModuleTab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('bulk-signin');
  const [signInResults, setSignInResults] = useState<AuthResult[]>([]);

  const handleResultsUpdate = useCallback((results: AuthResult[]) => {
    setSignInResults(results);
  }, []);

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
                : 'Bulk Contest Joining & Media Upload'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="badge badge-info animate-pulse-slow">
              Supabase Developer Mode
            </span>
            <span className="badge badge-neutral">v2.0.0</span>
          </div>
        </header>

        {/* Active Module */}
        <div style={{ minHeight: 'calc(100vh - 160px)' }}>
          {activeTab === 'bulk-signin' && (
            <BulkSignIn onResultsUpdate={handleResultsUpdate} />
          )}
          {activeTab === 'contest-join' && (
            <ContestJoin signInResults={signInResults} />
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
