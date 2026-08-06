import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  ImagePlus,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Trash2,
  FileText,
  Trophy,
} from 'lucide-react';
import type { AuthResult, ContestJoinResult, SignedInUser } from '../types';
import type { EnvConfig } from '../constants';

interface MemeUploadProps {
  signInResults: AuthResult[];
  currentEnvConfig: EnvConfig;
}

const MemeUpload: React.FC<MemeUploadProps> = ({ signInResults, currentEnvConfig }) => {
  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Users, Media & Metadata
  const [selectedUsers, setSelectedUsers] = useState<SignedInUser[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Metadata Configuration
  const [memeTitleTemplate, setMemeTitleTemplate] = useState('Meme by {email}');
  const [memeDescription, setMemeDescription] = useState('Awesome upload via Admin script');
  const [memeType, setMemeType] = useState<'meme' | 'flash'>('meme');
  const [memeStatus, setMemeStatus] = useState<'active' | 'draft' | 'queued'>('active');
  const [tags, setTags] = useState('funny,trending');
  const [categories, setCategories] = useState('Comedy');

  // Step 2: Execution
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

  const addLog = useCallback((text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev, { text, type, time }]);
  }, []);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { joinCurrentIndexRef.current = joinCurrentIndex; }, [joinCurrentIndex]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // Reset state when environment changes
  useEffect(() => {
    setSelectedUsers([]);
    setImageFiles([]);
    setImagePreviews([]);
    setJoinResults([]);
    setIsJoining(false);
    setIsPaused(false);
    setJoinCurrentIndex(0);
    joinCurrentIndexRef.current = 0;
    setLogs([]);
    setStep(1);
    addLog(`Switched meme upload environment config to: ${currentEnvConfig.name}`, 'info');
  }, [currentEnvConfig, addLog]);

  // Get signed-in users with valid tokens
  const availableUsers: SignedInUser[] = signInResults
    .filter((r) => r.status === 'SUCCESS' && r.accessToken && !r.accessToken.startsWith('('))
    .map((r) => ({ email: r.email, accessToken: r.accessToken!, refreshToken: r.refreshToken }));

  // Media handling
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    // Generate previews
    const newPreviews = [...imagePreviews];
    files.forEach((file) => {
      if (file.type.startsWith('video/')) {
        newPreviews.push(URL.createObjectURL(file));
        setImagePreviews([...newPreviews]);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          newPreviews.push(ev.target?.result as string);
          setImagePreviews([...newPreviews]);
        };
        reader.readAsDataURL(file);
      }
    });
    addLog(`Added ${files.length} file(s). Total: ${newFiles.length}`, 'info');
  };

  const removeMedia = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadPresetMedia = () => {
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    addLog('Generating 20 preset media files (15 images and 5 dynamic videos)...', 'info');

    // Image generator
    const generateMemeImage = (index: number): Promise<{ file: File; dataUrl: string }> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, 600, 400);
          const hue1 = (index * 18) % 360;
          const hue2 = ((index * 18) + 120) % 360;
          grad.addColorStop(0, `hsl(${hue1}, 80%, 40%)`);
          grad.addColorStop(1, `hsl(${hue2}, 80%, 25%)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 600, 400);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.arc(150, 100, 80, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(450, 300, 120, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 15;
          ctx.strokeRect(0, 0, 600, 400);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const topCaptions = [
            "WHEN THE SCRIPT FINALLY WORKS",
            "DEV VS PROD BE LIKE",
            "MOCKING 20 IMAGES LIKE A PRO",
            "LITZCHILL MEME ARENA",
            "FASTEST CONTEST JOINER",
            "SUPABASE IS AWESOME",
            "VIBRANT APP DESIGN ONLY",
            "IT WORKS ON MY MACHINE",
            "CSS GLASSMORPHISM POWER",
            "COFFEE IN, CODE OUT",
            "GIT PUSH -F ORIGIN MAIN",
            "ONE DOES NOT SIMPLY",
            "REACT RE-RENDERS GO BRRR",
            "TYPESCRIPT SAVED MY LIFE",
            "BUG FIXED IN PRODUCTION"
          ];

          const botCaptions = [
            "Satisfied Developer Noises",
            "Everything is fine",
            "No more manual uploads!",
            "Let the games begin",
            "20 entries in 1 second",
            "Scale it up",
            "Pure premium design",
            "Now deploy to production",
            "Looks extremely premium",
            "Ready for the contest",
            "Hope nobody notices",
            "Join the dev contest",
            "Join the alpha contest",
            "This is premium content",
            "Tested and approved"
          ];

          const topText = topCaptions[index % topCaptions.length];
          const bottomText = botCaptions[index % botCaptions.length];

          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 8;
          ctx.fillText(topText, 300, 80);
          ctx.fillStyle = '#f3f4f6';
          ctx.font = 'italic 24px sans-serif';
          ctx.fillText(bottomText, 300, 320);

          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(`Preset Meme Image #${index + 1}`, 300, 200);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `preset_meme_${index + 1}.png`, { type: 'image/png' });
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ file, dataUrl });
          }
        }, 'image/png');
      });
    };

    // Video generator
    const generateMemeVideo = (index: number): Promise<{ file: File; dataUrl: string }> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        let stream: MediaStream;
        try {
          stream = canvas.captureStream(25);
        } catch (e) {
          canvas.toBlob((blob) => {
            const file = new File([blob || new Blob()], `preset_video_${index + 1}.mp4`, { type: 'video/mp4' });
            resolve({ file, dataUrl: canvas.toDataURL('image/png') });
          });
          return;
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const file = new File([blob], `preset_video_${index + 1}.webm`, { type: 'video/webm' });
          const dataUrl = URL.createObjectURL(blob);
          resolve({ file, dataUrl });
        };

        mediaRecorder.start();
        let frame = 0;
        const durationFrames = 30; // ~1.2s
        
        function drawFrame() {
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 400, 300);
            
            ctx.save();
            ctx.translate(200, 130);
            ctx.rotate((frame * Math.PI) / 15);
            
            const grad = ctx.createLinearGradient(-40, -40, 40, 40);
            const hue = (index * 60) % 360;
            grad.addColorStop(0, `hsl(${hue}, 80%, 55%)`);
            grad.addColorStop(1, `hsl(${hue + 120}, 90%, 40%)`);
            ctx.fillStyle = grad;
            ctx.fillRect(-40, -40, 80, 80);
            ctx.restore();
            
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(200, 130, 70, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(200, 130, 70, 0, (frame / durationFrames) * Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("VIDEO RENDERING TESTS", 200, 240);
            
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '12px monospace';
            ctx.fillText(`Dynamic WebM Clip #${index - 14}`, 200, 265);
          }
          
          frame++;
          if (frame < durationFrames) {
            requestAnimationFrame(drawFrame);
          } else {
            mediaRecorder.stop();
          }
        }
        
        drawFrame();
      });
    };

    const promises = Array.from({ length: 20 }).map((_, i) => {
      if (i < 15) {
        return generateMemeImage(i);
      } else {
        return generateMemeVideo(i);
      }
    });

    Promise.all(promises).then((resList) => {
      resList.forEach((r) => {
        newFiles.push(r.file);
        newPreviews.push(r.dataUrl);
      });
      setImageFiles((prev) => [...prev, ...newFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
      addLog(`Successfully generated presets: 15 images & 5 webm videos. Total media count: ${imageFiles.length + 20}`, 'success');
    });
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

  const getAssignedMedia = (userIndex: number): { file: File; preview: string } | null => {
    if (imageFiles.length === 0) return null;
    const idx = userIndex % imageFiles.length;
    return { file: imageFiles[idx], preview: imagePreviews[idx] || '' };
  };

  const getMemeTitle = (email: string) => {
    return memeTitleTemplate.replace('{email}', email.split('@')[0]);
  };

  // Execute Bulk Upload
  const startBulkUpload = async () => {
    if (selectedUsers.length === 0) { addLog('No users selected.', 'error'); return; }
    if (imageFiles.length === 0) { addLog('No media files loaded. Please add or drag media.', 'error'); return; }

    setIsJoining(true);
    setIsPaused(false);
    setStep(2);

    addLog(`Starting bulk meme upload sequence...`, 'info');
    addLog(`Users: ${selectedUsers.length} | Batch: ${batchSize} | Delay: ${delayMs}ms`, 'info');

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
        const assigned = getAssignedMedia(globalIdx);
        if (!assigned) {
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'FAILED', errorMessage: 'No media assigned' }; return n; });
          return;
        }

        const memeTitle = getMemeTitle(user.email);
        const file = assigned.file;

        try {
          // Step A: Initiate
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'INITIATING' }; return n; });

          const initiateRes = await fetch(`${currentEnvConfig.baseUrl}/memes/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
            body: JSON.stringify({
              meme_title: memeTitle,
              description: memeDescription,
              meme_type: memeType,
              meme_status: memeStatus,
              tags: tags,
              categories: categories,
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

          // Step B: Upload file
          setJoinResults((prev) => { const n = [...prev]; n[globalIdx] = { ...n[globalIdx], status: 'UPLOADING', progress: 0 }; return n; });

          const fileBlob = file;

          // Try direct TUS upload
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
            // Fallback direct storage upload
            const storageUrl = `${currentEnvConfig.supabaseUrl}/storage/v1/object/${bucket_name}/${upload_path}`;
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

          const completeRes = await fetch(`${currentEnvConfig.baseUrl}/memes/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
            body: JSON.stringify({
              upload_path,
              thumbnail_upload_path,
              meme_title: memeTitle,
              description: memeDescription,
              meme_type: memeType,
              meme_status: memeStatus,
              tags: tags,
              categories: categories,
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
          addLog(`✓ ${user.email} uploaded successfully (${latencyMs}ms)`, 'success');

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

    addLog('Bulk upload completed!', 'success');
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
    setStep(1);
  };

  // Stats
  const joinSuccess = joinResults.filter((r) => r.status === 'SUCCESS').length;
  const joinFailed = joinResults.filter((r) => r.status === 'FAILED').length;
  const joinTotal = joinResults.length;
  const joinProgress = joinTotal > 0 ? Math.round(((joinSuccess + joinFailed) / joinTotal) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Upload size={24} style={{ color: 'var(--accent-cyan)' }} />
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Bulk Meme Upload Module</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0', fontSize: '0.85rem' }}>Upload standard memes and flashes to the platform with customization options</p>
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

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[{ n: 1, label: 'Configure & Load Media' }, { n: 2, label: 'Execute Upload' }].map((s, idx) => (
          <React.Fragment key={s.n}>
            <button
              onClick={() => { if (s.n <= step) setStep(s.n as 1 | 2); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                background: step === s.n ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))' : 'rgba(255,255,255,0.03)',
                border: step === s.n ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-color)',
                color: step === s.n ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === s.n ? 600 : 400, fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: step >= s.n ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', color: '#fff' }}>{s.n}</span>
              {s.label}
            </button>
            {idx < 1 && <div style={{ width: '24px', height: '1px', background: 'var(--border-color)' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: Setup & Previews */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left Panel: User list */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Select Users ({selectedUsers.length}/{availableUsers.length})</h3>
              <button className="btn btn-secondary" onClick={selectAllUsers} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                {selectedUsers.length === availableUsers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableUsers.map((user) => {
                const isChecked = selectedUsers.some((u) => u.email === user.email);
                return (
                  <label
                    key={user.email}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s',
                      background: isChecked ? 'rgba(6,182,212,0.08)' : 'transparent',
                      border: isChecked ? '1px solid rgba(6,182,212,0.2)' : '1px solid transparent',
                    }}
                  >
                    <input type="checkbox" checked={isChecked} onChange={() => toggleUser(user)} style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 500 : 400 }}>{user.email}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Upload Settings & Media */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Meta Fields */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Meme Metadata</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meme Type</label>
                  <select value={memeType} onChange={(e) => setMemeType(e.target.value as any)} style={{ width: '100%', marginTop: '4px' }}>
                    <option value="meme">Standard Meme</option>
                    <option value="flash">Flash Card</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meme Status</label>
                  <select value={memeStatus} onChange={(e) => setMemeStatus(e.target.value as any)} style={{ width: '100%', marginTop: '4px' }}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="queued">Queued</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title Template <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({'{email}'} → username)</span></label>
                  <input type="text" value={memeTitleTemplate} onChange={(e) => setMemeTitleTemplate(e.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description</label>
                  <textarea value={memeDescription} onChange={(e) => setMemeDescription(e.target.value)} rows={2} style={{ width: '100%', marginTop: '4px', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
                    <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categories (comma-separated)</label>
                    <input type="text" value={categories} onChange={(e) => setCategories(e.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Media Upload Area */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Media Assets ({imageFiles.length} items)</h3>
              <div
                style={{
                  border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s ease', background: 'rgba(255,255,255,0.02)',
                }}
                onClick={() => document.getElementById('meme-media-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
                  if (files.length > 0) {
                    const dt = new DataTransfer();
                    files.forEach((f) => dt.items.add(f));
                    const input = document.getElementById('meme-media-input') as HTMLInputElement;
                    input.files = dt.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                <ImagePlus size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click or drag images/videos here</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Files cycle across users sequentially</div>
              </div>
              <input id="meme-media-input" type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} style={{ display: 'none' }} />

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadPresetMedia}
                  style={{ fontSize: '0.85rem', padding: '8px 16px', gap: '6px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
                >
                  <Trophy size={14} style={{ color: 'var(--accent-cyan)' }} />
                  Load 20 Preset Media Files
                </button>
                {imageFiles.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setImageFiles([]); setImagePreviews([]); addLog('Cleared all selected media files', 'info'); }}
                    style={{ fontSize: '0.85rem', padding: '8px 16px', gap: '6px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.2)' }}
                  >
                    <Trash2 size={14} />
                    Clear All
                  </button>
                )}
              </div>

              {imagePreviews.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                  {imagePreviews.map((preview, idx) => {
                    const isVideo = imageFiles[idx]?.type?.startsWith('video/');
                    return (
                      <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                        {isVideo ? (
                          <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} muted />
                        ) : (
                          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                        )}
                        <button
                          onClick={() => removeMedia(idx)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-rose)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
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
              onClick={startBulkUpload}
              disabled={selectedUsers.length === 0 || imageFiles.length === 0 || isJoining}
              style={{ padding: '14px', fontSize: '1rem', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-primary))' }}
            >
              <Play size={18} />
              Upload Memes for {selectedUsers.length} Users
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Execution Results */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Progress */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Upload Progress</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isJoining ? (
                    <button className="btn btn-secondary" onClick={handlePauseJoin} style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>
                      <Pause size={14} /> Pause
                    </button>
                  ) : joinProgress < 100 ? (
                    <button className="btn btn-primary" onClick={startBulkUpload} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
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
                <div style={{ width: `${joinProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-emerald) 100%)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Results Table */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Upload Results</h3>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px', width: '80px' }}>Media</th>
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
                        SUCCESS: { badge: 'badge-success', label: 'Uploaded', icon: <CheckCircle2 size={12} /> },
                        FAILED: { badge: 'badge-error', label: 'Failed', icon: <XCircle size={12} /> },
                      };
                      const st = statusMap[r.status] || statusMap.PENDING;
                      const assigned = getAssignedMedia(idx);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.email}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {assigned?.preview && (
                              assigned.file.type.startsWith('video/') ? (
                                <video src={assigned.preview} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} muted />
                              ) : (
                                <img src={assigned.preview} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                              )
                            )}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${st.badge}`} style={{ gap: '4px' }}>{st.icon} {st.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: r.status === 'FAILED' ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                            {r.status === 'SUCCESS' && r.entryId ? `Meme ID: ${r.entryId.substring(0, 12)}... (${r.latencyMs}ms)` : r.errorMessage || '-'}
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

export default MemeUpload;
