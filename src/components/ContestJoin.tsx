import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Trophy,
  RefreshCw,
  ImagePlus,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Users as UsersIcon,
  AlertTriangle,
  Trash2,
  FileText,
} from 'lucide-react';
import type { AuthResult, Contest, ContestJoinResult, SignedInUser } from '../types';

interface ContestJoinProps {
  signInResults: AuthResult[];
}

const BASE_URL = 'https://czgibkbjvqhsgdsnnnbt.supabase.co/functions/v1';

const ContestJoin: React.FC<ContestJoinProps> = ({ signInResults }) => {
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Contests
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [loadingContests, setLoadingContests] = useState(false);
  const [contestError, setContestError] = useState('');

  // Step 2: Users & Media
  const [selectedUsers, setSelectedUsers] = useState<SignedInUser[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [memeTitleTemplate, setMemeTitleTemplate] = useState('Contest Entry by {email}');
  const [memeDescription, setMemeDescription] = useState('');

  // Step 3: Execution
  const [joinResults, setJoinResults] = useState<ContestJoinResult[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [batchSize, setBatchSize] = useState(2);
  const [delayMs, setDelayMs] = useState(1000);
  const [joinCurrentIndex, setJoinCurrentIndex] = useState(0);
  const joinCurrentIndexRef = useRef(0);

  // Logs
  const [logs, setLogs] = useState<Array<{ text: string; type: 'info' | 'success' | 'error' | 'warn'; time: string }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { joinCurrentIndexRef.current = joinCurrentIndex; }, [joinCurrentIndex]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const addLog = useCallback((text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev, { text, type, time }]);
  }, []);

  // Get signed-in users with valid tokens
  const availableUsers: SignedInUser[] = signInResults
    .filter((r) => r.status === 'SUCCESS' && r.accessToken && !r.accessToken.startsWith('('))
    .map((r) => ({ email: r.email, accessToken: r.accessToken!, refreshToken: r.refreshToken }));

  // ── STEP 1: Fetch Contests ──
  const fetchContests = async () => {
    if (availableUsers.length === 0) {
      setContestError('No signed-in users available. Please run Bulk Sign-In first.');
      return;
    }
    setLoadingContests(true);
    setContestError('');
    const token = availableUsers[0].accessToken;
    try {
      const res = await fetch(`${BASE_URL}/contests?status=O`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const contestList = data?.data || data?.contests || [];
      if (Array.isArray(contestList) && contestList.length > 0) {
        setContests(contestList);
        addLog(`Fetched ${contestList.length} ongoing contest(s).`, 'success');
      } else {
        setContests([]);
        addLog('No ongoing contests found.', 'warn');
      }
    } catch (err: any) {
      setContestError(err.message || 'Failed to fetch contests');
      addLog(`Failed to fetch contests: ${err.message}`, 'error');
    } finally {
      setLoadingContests(false);
    }
  };

  // ── STEP 2: Image handling ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    // Generate previews
    const newPreviews = [...imagePreviews];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target?.result as string);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
    addLog(`Added ${files.length} image(s). Total: ${newFiles.length}`, 'info');
  };

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleUser = (user: SignedInUser) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.email === user.email);
      if (exists) return prev.filter((u) => u.email !== user.email);
      return [...prev, user];
    });
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === availableUsers.length) setSelectedUsers([]);
    else setSelectedUsers([...availableUsers]);
  };

  const getAssignedImage = (userIndex: number): { file: File; preview: string } | null => {
    if (imageFiles.length === 0) return null;
    const idx = userIndex % imageFiles.length;
    return { file: imageFiles[idx], preview: imagePreviews[idx] || '' };
  };

  const getMemeTitle = (email: string) => {
    return memeTitleTemplate.replace('{email}', email.split('@')[0]);
  };

  // ── STEP 3: Execute Bulk Join ──
  const startBulkJoin = async () => {
    if (!selectedContest) { addLog('No contest selected.', 'error'); return; }
    if (selectedUsers.length === 0) { addLog('No users selected.', 'error'); return; }
    if (imageFiles.length === 0) { addLog('No images uploaded. Please add at least one image.', 'error'); return; }

    setIsJoining(true);
    setIsPaused(false);
    setStep(3);

    const contestId = selectedContest.contest_id || selectedContest.id || '';
    addLog(`Starting bulk contest join for "${selectedContest.contest_title || selectedContest.title}" (${contestId})`, 'info');
    addLog(`Users: ${selectedUsers.length} | Batch: ${batchSize} | Delay: ${delayMs}ms`, 'info');

    // Initialize results
    let currentResults: ContestJoinResult[] = [];
    if (joinCurrentIndexRef.current === 0) {
      currentResults = selectedUsers.map((u, idx) => ({
        email: u.email,
        status: 'PENDING',
        assignedImage: imageFiles[idx % imageFiles.length]?.name || '',
        memeTitle: getMemeTitle(u.email),
        timestamp: new Date().toISOString(),
      }));
      setJoinResults(currentResults);
    }

    const totalUsers = selectedUsers.length;

    while (joinCurrentIndexRef.current < totalUsers) {
      if (isPausedRef.current) { addLog('Execution paused.', 'warn'); setIsJoining(false); return; }

      const start = joinCurrentIndexRef.current;
      const end = Math.min(start + batchSize, totalUsers);
      const batch = selectedUsers.slice(start, end);

      addLog(`Processing batch: users ${start + 1} to ${end}...`, 'info');

      const batchPromises = batch.map(async (user, localIdx) => {
        const globalIdx = start + localIdx;
        const startTime = performance.now();
        const assigned = getAssignedImage(globalIdx);
        if (!assigned) {
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'FAILED', errorMessage: 'No image assigned' }; return n; });
          return;
        }

        const memeTitle = getMemeTitle(user.email);
        const file = assigned.file;

        try {
          // Step A: Initiate
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'INITIATING' }; return n; });

          const initiateRes = await fetch(`${BASE_URL}/contests/${contestId}/join/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
            body: JSON.stringify({
              meme_title: memeTitle,
              description: memeDescription || `Contest entry for ${selectedContest.contest_title || ''}`,
              meme_type: 'contest',
              file_name: file.name,
              content_type: file.type,
              file_size: file.size,
            }),
          });

          if (!initiateRes.ok) {
            const errText = await initiateRes.text();
            let errMsg = `Initiate failed: HTTP ${initiateRes.status}`;
            try { const errJson = JSON.parse(errText); errMsg = errJson.message || errJson.error || errMsg; } catch (_e) { /* ignore */ }
            throw new Error(errMsg);
          }

          const initiateData = await initiateRes.json();
          const { upload_path, tus_endpoint, bucket_name, content_type, cache_control } = initiateData.data || {};
          const thumbnail_upload_path = initiateData.data?.thumbnail_upload_path || null;

          if (!upload_path || !tus_endpoint) throw new Error('Invalid initiate response: missing upload_path or tus_endpoint');

          // Step B: Upload via simple PUT (TUS is complex in browser, use direct upload)
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'UPLOADING', progress: 0 }; return n; });

          // Use tus-js-client compatible approach: create blob, upload via fetch to TUS
          const fileBlob = file;

          // Try direct TUS upload via creation-with-upload
          const tusRes = await fetch(tus_endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
              'x-upsert': 'false',
              'Content-Type': 'application/offset+octet-stream',
              'Upload-Length': String(file.size),
              'Upload-Metadata': `bucketName ${btoa(bucket_name)},objectName ${btoa(upload_path)},contentType ${btoa(content_type || file.type)},cacheControl ${btoa(cache_control || '3600')}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': '0',
            },
            body: fileBlob,
          });

          if (!tusRes.ok && tusRes.status !== 204) {
            // Fallback: try Supabase storage direct upload
            const storageUrl = `https://czgibkbjvqhsgdsnnnbt.supabase.co/storage/v1/object/${bucket_name}/${upload_path}`;
            const storageRes = await fetch(storageUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${user.accessToken}`,
                'Content-Type': file.type,
                'x-upsert': 'false',
              },
              body: fileBlob,
            });
            if (!storageRes.ok) {
              const errText = await storageRes.text();
              throw new Error(`Upload failed: HTTP ${storageRes.status} - ${errText.substring(0, 200)}`);
            }
          }

          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], progress: 100 }; return n; });

          // Step C: Complete
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'COMPLETING' }; return n; });

          const completeRes = await fetch(`${BASE_URL}/contests/${contestId}/join/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
            body: JSON.stringify({
              upload_path,
              thumbnail_upload_path,
              meme_title: memeTitle,
              description: memeDescription || `Contest entry for ${selectedContest.contest_title || ''}`,
              meme_type: 'contest',
            }),
          });

          const latencyMs = Math.round(performance.now() - startTime);

          if (!completeRes.ok) {
            const errText = await completeRes.text();
            let errMsg = `Complete failed: HTTP ${completeRes.status}`;
            try { const errJson = JSON.parse(errText); errMsg = errJson.message || errJson.error || errMsg; } catch (_e) { /* ignore */ }
            throw new Error(errMsg);
          }

          const completeData = await completeRes.json();
          const entryId = completeData?.data?.entry_id || completeData?.data?.meme_id || completeData?.data?.id || '';

          setJoinResults((prev) => {
            const n = [...prev];
            n[globalIdx] = { ...n[globalIdx], status: 'SUCCESS', entryId, latencyMs, timestamp: new Date().toISOString() };
            return n;
          });
          addLog(`✓ ${user.email} joined contest successfully (${latencyMs}ms)`, 'success');

        } catch (err: any) {
          const latencyMs = Math.round(performance.now() - startTime);
          setJoinResults((prev) => {
            const n = [...prev];
            n[globalIdx] = { ...n[globalIdx], status: 'FAILED', errorMessage: err.message || 'Unknown error', latencyMs, timestamp: new Date().toISOString() };
            return n;
          });
          addLog(`✗ ${user.email} failed: ${err.message}`, 'error');
        }
      });

      await Promise.all(batchPromises);

      const newIdx = end;
      setJoinCurrentIndex(newIdx);
      joinCurrentIndexRef.current = newIdx;

      if (newIdx < totalUsers && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    addLog('Bulk contest join completed!', 'success');
    setIsJoining(false);
  };

  const handlePauseJoin = () => { setIsPaused(true); addLog('Requesting pause...', 'warn'); };

  const resetJoin = () => {
    setJoinResults([]);
    setIsJoining(false);
    setIsPaused(false);
    setJoinCurrentIndex(0);
    joinCurrentIndexRef.current = 0;
    setLogs([]);
    setStep(2);
  };

  // Stats
  const joinSuccess = joinResults.filter((r) => r.status === 'SUCCESS').length;
  const joinFailed = joinResults.filter((r) => r.status === 'FAILED').length;
  const joinTotal = joinResults.length;
  const joinProgress = joinTotal > 0 ? Math.round(((joinSuccess + joinFailed) / joinTotal) * 100) : 0;

  // ── RENDER ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Trophy size={24} style={{ color: 'var(--accent-amber)' }} />
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Contest Join Module</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0', fontSize: '0.85rem' }}>Bulk join users to ongoing contests with unique media uploads</p>
        </div>
      </div>

      {/* No users warning */}
      {availableUsers.length === 0 && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>No Signed-In Users Available</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Switch to the <strong>Bulk Sign-In</strong> tab first and sign in users to generate access tokens.</div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[{ n: 1, label: 'Select Contest' }, { n: 2, label: 'Users & Media' }, { n: 3, label: 'Execute' }].map((s, idx) => (
          <React.Fragment key={s.n}>
            <button
              onClick={() => { if (s.n <= step || (s.n === 2 && selectedContest)) setStep(s.n as 1 | 2 | 3); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                background: step === s.n ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))' : 'rgba(255,255,255,0.03)',
                border: step === s.n ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-color)',
                color: step === s.n ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === s.n ? 600 : 400, fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: step >= s.n ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: '#fff' }}>{s.n}</span>
              {s.label}
            </button>
            {idx < 2 && <div style={{ width: '24px', height: '1px', background: 'var(--border-color)' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Select Contest ── */}
      {step === 1 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ongoing Contests</h3>
            <button className="btn btn-primary" onClick={fetchContests} disabled={loadingContests || availableUsers.length === 0} style={{ fontSize: '0.85rem' }}>
              {loadingContests ? <Loader2 size={16} className="animate-spin-loader" /> : <RefreshCw size={16} />}
              {loadingContests ? 'Fetching...' : 'Fetch Contests'}
            </button>
          </div>

          {contestError && <div style={{ padding: '12px 16px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: '16px' }}>{contestError}</div>}

          {contests.length === 0 && !loadingContests && !contestError && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Click "Fetch Contests" to load ongoing contests from the server.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {contests.map((contest) => {
              const id = contest.contest_id || contest.id || '';
              const isSelected = selectedContest?.contest_id === id || selectedContest?.id === id;
              return (
                <div
                  key={id}
                  onClick={() => { setSelectedContest(contest); addLog(`Selected contest: "${contest.contest_title || contest.title}"`, 'info'); }}
                  style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  {contest.contest_image && (
                    <img src={contest.contest_image} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
                  )}
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>{contest.contest_title || contest.title || 'Untitled'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{contest.description || ''}</div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><UsersIcon size={12} /> {contest.participant_count ?? 0}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {contest.end_date ? new Date(contest.end_date).toLocaleDateString() : '-'}</span>
                  </div>
                  {isSelected && <div className="badge badge-success" style={{ marginTop: '8px' }}><CheckCircle2 size={12} /> Selected</div>}
                </div>
              );
            })}
          </div>

          {selectedContest && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Continue → Users & Media</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Users & Media ── */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left: User selection */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Select Users ({selectedUsers.length}/{availableUsers.length})</h3>
              <button className="btn btn-secondary" onClick={selectAllUsers} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                {selectedUsers.length === availableUsers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableUsers.map((user) => {
                const isChecked = selectedUsers.some((u) => u.email === user.email);
                return (
                  <label
                    key={user.email}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s',
                      background: isChecked ? 'rgba(99,102,241,0.08)' : 'transparent',
                      border: isChecked ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    }}
                  >
                    <input type="checkbox" checked={isChecked} onChange={() => toggleUser(user)} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 500 : 400 }}>{user.email}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right: Media & Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Meme Metadata */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Meme Metadata</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title Template <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({'{email}'} → username)</span></label>
                  <input type="text" value={memeTitleTemplate} onChange={(e) => setMemeTitleTemplate(e.target.value)} placeholder="Contest Entry by {email}" style={{ width: '100%', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description (optional)</label>
                  <textarea value={memeDescription} onChange={(e) => setMemeDescription(e.target.value)} placeholder="Enter description..." rows={2} style={{ width: '100%', marginTop: '4px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Upload Media ({imageFiles.length} images)</h3>
              <div
                style={{
                  border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s ease', background: 'rgba(255,255,255,0.02)',
                }}
                onClick={() => document.getElementById('contest-image-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                  if (files.length > 0) {
                    const dt = new DataTransfer();
                    files.forEach((f) => dt.items.add(f));
                    const input = document.getElementById('contest-image-input') as HTMLInputElement;
                    input.files = dt.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                <ImagePlus size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click or drag images here</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Images cycle across users sequentially</div>
              </div>
              <input id="contest-image-input" type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />

              {imagePreviews.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                      <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                      <button
                        onClick={() => removeImage(idx)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-rose)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Config */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Execution Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Batch Size ({batchSize})</label>
                  <input type="range" min="1" max="10" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Delay ({delayMs}ms)</label>
                  <input type="range" min="500" max="5000" step="250" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={startBulkJoin}
              disabled={selectedUsers.length === 0 || imageFiles.length === 0 || isJoining}
              style={{ padding: '14px', fontSize: '1rem' }}
            >
              <Play size={18} />
              Join {selectedUsers.length} Users to Contest
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Execution Results ── */}
      {step === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Progress Bar */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Join Progress</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isJoining ? (
                    <button className="btn btn-secondary" onClick={handlePauseJoin} style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>
                      <Pause size={14} /> Pause
                    </button>
                  ) : joinProgress < 100 ? (
                    <button className="btn btn-primary" onClick={startBulkJoin} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      <Play size={14} /> Resume
                    </button>
                  ) : null}
                  <button className="btn btn-secondary" onClick={resetJoin} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    Back to Setup
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <span className="badge badge-success">{joinSuccess} Success</span>
                <span className="badge badge-error">{joinFailed} Failed</span>
                <span className="badge badge-neutral">{joinTotal - joinSuccess - joinFailed} Remaining</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${joinProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-amber) 0%, var(--accent-emerald) 100%)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Results Table */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Join Results</h3>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px', width: '80px' }}>Image</th>
                      <th style={{ padding: '10px 14px', width: '120px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joinResults.map((r, idx) => {
                      const statusMap: Record<string, { badge: string; label: string; icon?: React.ReactNode }> = {
                        PENDING: { badge: 'badge-neutral', label: 'Pending' },
                        INITIATING: { badge: 'badge-info', label: 'Initiating', icon: <Loader2 size={12} className="animate-spin-loader" /> },
                        UPLOADING: { badge: 'badge-info', label: `Uploading ${r.progress || 0}%`, icon: <Loader2 size={12} className="animate-spin-loader" /> },
                        COMPLETING: { badge: 'badge-info', label: 'Completing', icon: <Loader2 size={12} className="animate-spin-loader" /> },
                        SUCCESS: { badge: 'badge-success', label: 'Joined', icon: <CheckCircle2 size={12} /> },
                        FAILED: { badge: 'badge-error', label: 'Failed', icon: <XCircle size={12} /> },
                      };
                      const st = statusMap[r.status] || statusMap.PENDING;
                      const assigned = getAssignedImage(idx);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.email}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {assigned?.preview && <img src={assigned.preview} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${st.badge}`} style={{ gap: '4px' }}>{st.icon} {st.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: r.status === 'FAILED' ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                            {r.status === 'SUCCESS' && r.entryId ? `Entry: ${r.entryId.substring(0, 12)}... (${r.latencyMs}ms)` : r.errorMessage || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Console */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: 'var(--accent-cyan)' }} /> Console
            </h3>
            <div style={{ flex: 1, background: '#040508', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: '1.5', overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {logs.length === 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>&gt;_ Ready...</span>
              ) : (
                logs.map((log, idx) => {
                  let c = '#e5e7eb';
                  if (log.type === 'success') c = 'var(--accent-emerald)';
                  if (log.type === 'error') c = 'var(--accent-rose)';
                  if (log.type === 'warn') c = 'var(--accent-amber)';
                  return (<div key={idx} style={{ display: 'flex', gap: '6px' }}><span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span><span style={{ color: c, wordBreak: 'break-all' }}>{log.text}</span></div>);
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestJoin;
