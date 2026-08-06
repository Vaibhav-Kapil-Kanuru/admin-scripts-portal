import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Settings,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { DEFAULT_USERS, DEFAULT_PASSWORD } from '../constants';
import type { EnvConfig } from '../constants';
import type { AuthResult, UserCredential } from '../types';
import {
  downloadFile,
  generateInputCSV,
  generateOutputCSV,
  generateExcel,
  generatePDF,
  parseInputCSV,
} from '../utils/csvHelper';

interface BulkSignInProps {
  onResultsUpdate?: (results: AuthResult[]) => void;
  currentEnvConfig: EnvConfig;
}

const BulkSignIn: React.FC<BulkSignInProps> = ({ onResultsUpdate, currentEnvConfig }) => {
  const [users, setUsers] = useState<UserCredential[]>(
    DEFAULT_USERS.map((email) => ({ email, password: DEFAULT_PASSWORD }))
  );
  const [customPassword, setCustomPassword] = useState(DEFAULT_PASSWORD);
  const [apiUrl, setApiUrl] = useState(
    currentEnvConfig.baseUrl + '/auth/signin/identity'
  );
  const [anonKey, setAnonKey] = useState(
    currentEnvConfig.supabaseAnonKey
  );

  const [batchSize, setBatchSize] = useState(5);
  const [delayMs, setDelayMs] = useState(200);
  const [searchTerm, setSearchTerm] = useState('');

  const [results, setResults] = useState<AuthResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [logs, setLogs] = useState<
    Array<{ text: string; type: 'info' | 'success' | 'error' | 'warn'; time: string }>
  >([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const isPausedRef = useRef(isPaused);
  const isRunningRef = useRef(isRunning);
  const currentIndexRef = useRef(currentIndex);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent of results changes
  useEffect(() => {
    onResultsUpdate?.(results);
  }, [results, onResultsUpdate]);

  // Update config when environment changes
  useEffect(() => {
    setApiUrl(currentEnvConfig.baseUrl + '/auth/signin/identity');
    setAnonKey(currentEnvConfig.supabaseAnonKey);
    handleReset();
    addLog(`Switched environment config to: ${currentEnvConfig.name}`, 'info');
  }, [currentEnvConfig]);


  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev, { text, type, time }]);
  };

  const handleReset = () => {
    setResults([]);
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setLogs([]);
    addLog('Execution state and logs cleared.', 'info');
  };

  const handleLoadDefaults = () => {
    handleReset();
    setUsers(DEFAULT_USERS.map((email) => ({ email, password: customPassword })));
    addLog(`Preloaded ${DEFAULT_USERS.length} default users list.`, 'success');
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateInputCSV(users.map((u) => u.email), customPassword);
    downloadFile(csvContent, 'litz_chill_input_users.csv');
    addLog('Input template CSV downloaded.', 'info');
  };

  const handleExportCSV = () => {
    if (results.length === 0) { addLog('No results to export. Run the signin script first.', 'warn'); return; }
    const csvContent = generateOutputCSV(results);
    downloadFile(csvContent, `litz_chill_signin_tokens_${Date.now()}.csv`);
    addLog(`Exported results for ${results.length} users to CSV.`, 'success');
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    if (results.length === 0) { addLog('No results to export.', 'warn'); return; }
    try { generateExcel(results); addLog(`Exported results to Excel spreadsheet.`, 'success'); } catch (err: any) { addLog(`Excel export failed: ${err.message}`, 'error'); }
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    if (results.length === 0) { addLog('No results to export.', 'warn'); return; }
    try { generatePDF(results); addLog(`Exported results to PDF report.`, 'success'); } catch (err: any) { addLog(`PDF export failed: ${err.message}`, 'error'); }
    setShowExportMenu(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseInputCSV(text);
        if (parsed.length === 0) { addLog('CSV parsing returned 0 credentials.', 'error'); return; }
        handleReset();
        const validated = parsed.map((p) => ({ email: p.email, password: p.password || customPassword }));
        setUsers(validated);
        addLog(`Imported ${validated.length} users from CSV successfully!`, 'success');
      } catch (err: any) { addLog(`Error parsing CSV file: ${err.message}`, 'error'); }
    };
    reader.readAsText(file);
  };

  const startBulkSignIn = async () => {
    if (isRunning) {
      if (isPaused) { setIsPaused(false); addLog('Resuming execution...', 'info'); }
      return;
    }
    setIsRunning(true);
    setIsPaused(false);

    let currentResults = [...results];
    if (currentIndexRef.current === 0) {
      currentResults = users.map((u) => ({ email: u.email, status: 'PENDING' as const, timestamp: new Date().toISOString() }));
      setResults(currentResults);
      addLog(`Initiating bulk sign-in sequence for ${users.length} users.`, 'info');
      addLog(`Batch size: ${batchSize} | Delay between batches: ${delayMs}ms`, 'info');
    } else {
      addLog(`Resuming bulk sign-in from user #${currentIndexRef.current + 1}.`, 'info');
    }

    const totalUsers = users.length;
    while (currentIndexRef.current < totalUsers) {
      if (isPausedRef.current) { addLog('Execution paused.', 'warn'); setIsRunning(false); return; }
      const start = currentIndexRef.current;
      const end = Math.min(start + batchSize, totalUsers);
      const currentBatch = users.slice(start, end);
      addLog(`Sending batch: users ${start + 1} to ${end}...`, 'info');

      setResults((prev) => {
        const next = [...prev];
        for (let i = start; i < end; i++) { if (next[i]) next[i].status = 'RUNNING'; }
        return next;
      });

      const batchPromises = currentBatch.map(async (userCred, localIndex) => {
        const globalIndex = start + localIndex;
        const startTime = performance.now();
        const timestamp = new Date().toISOString();
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
            body: JSON.stringify({ emailOrUsername: userCred.email, password: userCred.password || customPassword }),
          });
          const latencyMs = Math.round(performance.now() - startTime);
          const data = await res.json();
          const token = data?.data?.session?.access_token || data?.session?.access_token || data?.data?.access_token || data?.access_token || '';
          const refresh = data?.data?.session?.refresh_token || data?.session?.refresh_token || data?.data?.refresh_token || data?.refresh_token || '';

          if (res.ok) {
            setResults((prev) => {
              const next = [...prev];
              next[globalIndex] = { email: userCred.email, status: 'SUCCESS', statusCode: res.status, accessToken: token || `(no token — ${data?.message || 'signed in'})`, refreshToken: refresh, latencyMs, timestamp };
              return next;
            });
            return { email: userCred.email, success: true, latencyMs };
          } else {
            const errMsg = data?.message || data?.error?.message || data?.error || `HTTP error ${res.status}`;
            setResults((prev) => {
              const next = [...prev];
              next[globalIndex] = { email: userCred.email, status: 'FAILED', statusCode: res.status, errorMessage: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg), latencyMs, timestamp };
              return next;
            });
            return { email: userCred.email, success: false, error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };
          }
        } catch (err: any) {
          const latencyMs = Math.round(performance.now() - startTime);
          setResults((prev) => {
            const next = [...prev];
            next[globalIndex] = { email: userCred.email, status: 'FAILED', statusCode: 0, errorMessage: err.message || 'Connection failed', latencyMs, timestamp };
            return next;
          });
          return { email: userCred.email, success: false, error: err.message };
        }
      });

      const batchOutcomes = await Promise.all(batchPromises);
      batchOutcomes.forEach((o) => {
        if (o.success) addLog(`✓ ${o.email} succeeded in ${o.latencyMs}ms`, 'success');
        else addLog(`✗ ${o.email} failed: ${o.error}`, 'error');
      });

      const newIdx = end;
      setCurrentIndex(newIdx);
      currentIndexRef.current = newIdx;
      if (newIdx < totalUsers && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    addLog('Bulk sign-in execution completed!', 'success');
    setIsRunning(false);
  };

  const handlePause = () => { setIsPaused(true); addLog('Requesting pause...', 'warn'); };

  const copyToClipboard = (text: string, type: 'token' | 'index', indexVal: number) => {
    navigator.clipboard.writeText(text);
    if (type === 'index') { setCopiedIndex(indexVal); setTimeout(() => setCopiedIndex(null), 1500); }
    else { setCopiedToken(text); setTimeout(() => setCopiedToken(null), 1500); }
  };

  const filteredUsers = users.map((user, idx) => ({ ...user, originalIndex: idx })).filter((u) => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  const pendingCount = results.filter((r) => r.status === 'PENDING').length;
  const runningCount = results.filter((r) => r.status === 'RUNNING').length;
  const completionPercentage = users.length > 0 ? Math.round(((successCount + failedCount) / users.length) * 100) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Configurations */}
        <section className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <Settings size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>API & Execution Configuration</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supabase Sign-In Endpoint</label>
              <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://..." disabled={isRunning} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Default User Passwords</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showPasswords ? 'text' : 'password'} value={customPassword} onChange={(e) => { setCustomPassword(e.target.value); setUsers((prev) => prev.map((u) => ({ ...u, password: e.target.value }))); }} placeholder="Password" disabled={isRunning} style={{ width: '100%', paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supabase Anon Key</label>
            <input type="password" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="eyJhbG..." disabled={isRunning} style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Batch Concurrency Size ({batchSize})</label>
              <input type="range" min="1" max="20" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} disabled={isRunning} style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Delay Between Batches ({delayMs}ms)</label>
              <input type="range" min="0" max="3000" step="50" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} disabled={isRunning} style={{ cursor: 'pointer' }} />
            </div>
          </div>
        </section>

        {/* Controls & Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isRunning || isPaused ? (
                <button className="btn btn-primary" onClick={startBulkSignIn} style={{ flex: 1 }}>
                  <Play size={18} />
                  {currentIndex > 0 ? 'Resume Sign-in' : 'Start Bulk Sign-in'}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={handlePause} style={{ flex: 1, borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>
                  <Pause size={18} />
                  Pause Sequence
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleReset} style={{ gap: '6px' }}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Execution Progress</span>
                <span style={{ fontWeight: 600 }}>{successCount + failedCount} / {users.length} Users ({completionPercentage}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${completionPercentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-secondary) 100%)', boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' }}>
              <button className="btn btn-secondary" onClick={handleLoadDefaults} disabled={isRunning} style={{ fontSize: '0.85rem', flex: 1 }}>
                <Users size={14} /> Reset to 100 List
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ fontSize: '0.85rem' }}>
                <Download size={14} /> Get Input CSV
              </button>
              <div style={{ position: 'relative' }}>
                <input type="file" accept=".csv" id="csv-file-input" onChange={handleFileUpload} disabled={isRunning} style={{ display: 'none' }} />
                <label htmlFor="csv-file-input" className="btn btn-secondary" style={{ fontSize: '0.85rem', cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.5 : 1 }}>
                  <Upload size={14} /> Import CSV
                </label>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: '10px' }}>
            {[{ label: 'Success', count: successCount, badge: 'badge-success' }, { label: 'Failed', count: failedCount, badge: 'badge-error' }, { label: 'Running', count: runningCount, badge: 'badge-info' }, { label: 'Pending', count: pendingCount, badge: 'badge-neutral' }].map((s) => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className={`badge ${s.badge}`} style={{ fontSize: '0.9rem', padding: '2px 10px' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <section className="glass-panel" style={{ padding: '20px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Target Users List ({users.length})</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search target email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', width: '220px' }} />
              </div>
              <div ref={exportMenuRef} style={{ position: 'relative' }}>
                <button className="btn btn-primary" onClick={() => setShowExportMenu(!showExportMenu)} disabled={results.length === 0} style={{ height: '36px', padding: '0 16px', fontSize: '0.85rem', gap: '6px' }}>
                  <Download size={14} /> Export Results <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>
                {showExportMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '220px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 50, overflow: 'hidden', animation: 'fadeIn 0.15s ease-out' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Export Format</div>
                    {[
                      { handler: handleExportCSV, icon: <FileText size={16} style={{ color: 'var(--accent-emerald)' }} />, label: 'CSV Spreadsheet', desc: 'Comma-separated, opens in Excel' },
                      { handler: handleExportExcel, icon: <FileSpreadsheet size={16} style={{ color: 'var(--accent-cyan)' }} />, label: 'Excel Workbook (.xlsx)', desc: 'Formatted with columns & summary' },
                      { handler: handleExportPDF, icon: <Download size={16} style={{ color: 'var(--accent-rose)' }} />, label: 'PDF Report', desc: 'Professional styled document' },
                    ].map((item) => (
                      <button key={item.label} onClick={item.handler} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                        {item.icon}
                        <div><div style={{ fontWeight: 500 }}>{item.label}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', width: '50px' }}>#</th>
                  <th style={{ padding: '12px 16px', width: '250px' }}>Email</th>
                  <th style={{ padding: '12px 16px', width: '100px' }}>Status</th>
                  <th style={{ padding: '12px 16px', width: '80px' }}>Code</th>
                  <th style={{ padding: '12px 16px', width: '90px' }}>Latency</th>
                  <th style={{ padding: '12px 16px' }}>Generated Access Token</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>No target users matching search filters.</td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const res = results[user.originalIndex];
                    let statusBadge = <span className="badge badge-neutral">Idle</span>;
                    if (res) {
                      if (res.status === 'RUNNING') statusBadge = <span className="badge badge-info" style={{ gap: '6px' }}><Loader2 size={12} className="animate-spin-loader" /> Running</span>;
                      else if (res.status === 'SUCCESS') statusBadge = <span className="badge badge-success"><CheckCircle2 size={12} /> Success</span>;
                      else if (res.status === 'FAILED') statusBadge = <span className="badge badge-error"><XCircle size={12} /> Failed</span>;
                    }
                    return (
                      <tr key={user.originalIndex} style={{ borderBottom: '1px solid var(--border-color)', background: res?.status === 'RUNNING' ? 'rgba(6, 182, 212, 0.03)' : 'transparent', transition: 'background-color 0.2s ease' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{user.originalIndex + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{user.email}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{res?.statusCode ?? '-'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{res?.latencyMs ? `${res.latencyMs}ms` : '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {res?.status === 'SUCCESS' && res.accessToken ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }} title={res.accessToken}>{res.accessToken}</span>
                              <button onClick={() => copyToClipboard(res.accessToken!, 'index', user.originalIndex)} className="btn btn-secondary" style={{ padding: '4px 8px', height: '24px', fontSize: '0.7rem' }}>
                                {copiedIndex === user.originalIndex ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : res?.status === 'FAILED' ? (
                            <span style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>{res.errorMessage}</span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Right Column: Console */}
      <section className="glass-panel" style={{ padding: '20px', height: '100%', minHeight: '750px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
          <span style={{ color: 'var(--accent-cyan)' }}>▸</span>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Console Event Logs</h2>
        </div>
        <div style={{ flex: 1, background: '#040508', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: '1.4', overflowY: 'auto', maxHeight: '620px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {logs.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>&gt;_ Console is ready. Start execution to display real-time event logs...</span>
          ) : (
            logs.map((log, idx) => {
              let logColor = '#e5e7eb';
              if (log.type === 'success') logColor = 'var(--accent-emerald)';
              if (log.type === 'error') logColor = 'var(--accent-rose)';
              if (log.type === 'warn') logColor = 'var(--accent-amber)';
              return (<div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}><span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span><span style={{ color: logColor, wordBreak: 'break-all' }}>{log.text}</span></div>);
            })
          )}
          <div ref={logsEndRef} />
        </div>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Copy last generated JWT token:</span>
            <a href="https://jwt.io" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>jwt.io <ExternalLink size={10} /></a>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input type="text" readOnly value={results.filter((r) => r.status === 'SUCCESS').slice(-1)[0]?.accessToken || ''} placeholder="No valid token generated yet..." style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', paddingRight: '40px', background: 'var(--bg-secondary)', height: '36px' }} />
            <button className="btn btn-secondary" disabled={results.filter((r) => r.status === 'SUCCESS').length === 0} onClick={() => { const t = results.filter((r) => r.status === 'SUCCESS').slice(-1)[0]?.accessToken; if (t) copyToClipboard(t, 'token', 9999); }} style={{ position: 'absolute', right: '4px', height: '28px', padding: '0 8px', fontSize: '0.75rem' }}>
              {copiedToken ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BulkSignIn;
