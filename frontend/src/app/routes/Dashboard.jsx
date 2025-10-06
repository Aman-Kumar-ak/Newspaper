import { useEffect, useState, useRef } from 'react';
import { startGoogleLogin, tryReadTokensFromCallbackPayload, logoutGoogle } from '../../lib/auth';
import { setTokens, getTokens } from '../../state/authStore';
import { listAllGrouped, uploadWithProgress, deleteFile, getGroupForDate } from '../../lib/drive';
import FolderList from '../../components/drive/FolderList.jsx';
import Modal from '../../components/ui/Modal.jsx';
import UploadTray from '../../components/ui/UploadTray.jsx';
import Toast from '../../components/ui/Toast.jsx';
import LoadingOverlay from '../../components/ui/LoadingOverlay.jsx';

export default function Dashboard() {
  const [date, setDate] = useState(''); // DD-MM-YYYY for backend
  const [dateISO, setDateISO] = useState(''); // YYYY-MM-DD for <input type="date">
  const [file, setFile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [openProfile, setOpenProfile] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [trayItems, setTrayItems] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Fetching latest files...');
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Uploading');
  const profileMenuRef = useRef(null);

  useEffect(() => {
    // On mount, capture tokens from URL hash (after OAuth) and load data
    const t = tryReadTokensFromCallbackPayload();
    if (t && t.accessToken) {
      (async () => {
        const { fetchGoogleProfile } = await import('../../lib/auth');
        const profile = await fetchGoogleProfile(t.accessToken);
        setTokens({ ...t, ...profile });
      })();
    }
    // If already signed in but profile fields are missing, fetch them
    (async () => {
      const existing = getTokens();
      if (existing.accessToken && (!existing.username || !existing.email)) {
        try {
          const { fetchGoogleProfile } = await import('../../lib/auth');
          const profile = await fetchGoogleProfile(existing.accessToken);
          if (profile) setTokens({ ...existing, ...profile });
        } catch {}
      }
    })();
    (async () => {
      if (getTokens().accessToken) {
        setLoadingLabel('Fetching latest files...');
        setLoading(true);
        try {
          // When user hard refreshes the page, fetch latest from Drive (fresh)
          const g = await listAllGrouped({ fresh: true });
          setGroups(applyFilter(g, filter));
        } finally { setLoading(false); }
      }
    })();
  }, []);

  // Always get latest tokens for profile info
  const tokens = getTokens();

  // Handle click outside profile menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
    };

    if (openProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openProfile]);

  function applyFilter(groupsIn, f) {
    if (f === 'All') return groupsIn;
    const now = new Date();
    const isInRange = (dateStr) => {
      const [d, m, y] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (f === 'Today') return dt.toDateString() === now.toDateString();
      if (f === 'Last7') return (now - dt) / 86400000 <= 7;
      if (f === 'ThisMonth') return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      return true;
    };
    return groupsIn.filter(g => isInRange(g.date));
  }

  if (!tokens.accessToken) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Dashboard</h2>
        <button onClick={startGoogleLogin}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'Georgia, Times New Roman, Times, serif',
      color: '#222',
      overflow: 'hidden',
    }}>
      {/* News-style Header */}
      <div style={{ 
        padding: '24px 0 12px 0',
        borderBottom: '3px solid #d90429',
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        textAlign: 'center',
        letterSpacing: '1px',
      }}>
        <span style={{
          fontSize: '2.6rem',
          fontWeight: 900,
          color: '#d90429',
          fontFamily: 'Merriweather, Georgia, serif',
          textTransform: 'uppercase',
          marginRight: 8,
        }}>Newspaper PDF Viewer</span>
        <span style={{
          fontSize: '1.1rem',
          color: '#374151',
          fontWeight: 500,
          fontFamily: 'system-ui, sans-serif',
        }}>
          | Your Digital News Library
        </span>
      </div>
      {/* Topbar for actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        maxWidth: '90vw',
        margin: '0 auto',
        padding: '18px 0 0 0',
        gap: 24,
        position: 'relative',
      }}>
        {/* Upload and Search/Filter Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button style={{
            background: '#d90429',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: '1rem',
            padding: '8px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            cursor: 'pointer',
          }} onClick={() => setOpenUpload(true)}>
            Upload PDF
          </button>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: '1rem',
          }} />
          <select value={filter} onChange={async (e) => {
            const v = e.target.value;
            setFilter(v);
            const all = await listAllGrouped();
            setGroups(applyFilter(all, v));
          }} style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: '1rem',
          }}>
            <option value="All">All</option>
            <option value="Today">Today</option>
            <option value="Last7">Last 7 days</option>
            <option value="ThisMonth">This month</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        {/* Profile Icon aligned to the right */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            style={{
              background: 'linear-gradient(135deg, #ECF8F8 60%, #5DB7DE 100%)',
              color: '#0D21A1',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              fontWeight: 700,
              fontSize: '1.2rem',
              boxShadow: '0 2px 8px rgba(13,33,161,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 0.2s',
            }}
            onClick={() => setOpenProfile(v => !v)}
            title="Profile"
          >
            {tokens?.username ? tokens.username[0].toUpperCase() : 'U'}
          </button>
          {openProfile && (
            <div style={{
              position: 'absolute',
              top: 54,
              right: 0,
              background: '#fff',
              border: '1px solid #E7D8C9',
              borderRadius: 16,
              padding: 18,
              minWidth: 220,
              zIndex: 20,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              fontFamily: 'system-ui, sans-serif',
            }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0D21A1', marginBottom: 4 }}>{tokens?.username || 'User Name'}</div>
              <div style={{ color: '#374151', fontSize: 13, marginBottom: 12 }}>{tokens?.email || 'user@email.com'}</div>
              <button style={{
                background: '#d90429',
                color: '#fff',
                border: '1px solid #b10320',
                borderRadius: 10,
                fontWeight: 800,
                letterSpacing: 0.3,
                fontSize: '1rem',
                padding: '10px 20px',
                boxShadow: '0 4px 14px rgba(217,4,41,0.18)',
                cursor: 'pointer',
                width: '100%',
                marginTop: 10,
                transition: 'transform 0.06s ease, box-shadow 0.2s ease, background 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(217,4,41,0.28)'; e.currentTarget.style.background = '#c10324'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(217,4,41,0.18)'; e.currentTarget.style.background = '#d90429'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              aria-label="Log out"
              onClick={async () => {
                setLoadingLabel('Signing out...');
                setLoading(true);
                await logoutGoogle();
                localStorage.removeItem('googleTokens');
                window.location.reload();
              }}>Log out</button>
            </div>
          )}
        </div>
      </div>
      {/* Scrollable Content Area */}
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        width: '75vw',
        maxWidth: '80vw',
        margin: '0 auto',
        padding: '32px 0',
      }}>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '1.2rem', color: '#d90429' }}>No files yet. Upload your first PDF.</div>
        ) : (
          <div style={{ paddingBottom: '20px' }}>
            <FolderList
              groups={groups}
              search={search}
              onOpen={(file) => {
                window.open(`${window.location.origin}/#/viewer/${file.fileId}`, '_blank');
              }}
              onDelete={async (file) => {
                const ok = confirm('Delete this file?');
                if (!ok) return;
                await deleteFile(file.fileId);
                const updated = await getGroupForDate(file.folderDate || groups.find(g => g.files.some(f => f.fileId === file.fileId))?.date);
                setGroups(prev => {
                  const others = prev.filter(g => g.date !== updated.date);
                  return applyFilter([updated, ...others], filter);
                });
              }}
            />
          </div>
        )}
      </div>

      <Modal open={openUpload} title="Upload PDF" onClose={() => setOpenUpload(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            Date
            <input type="date" value={dateISO} onChange={e => {
              const raw = e.target.value; // YYYY-MM-DD
              setDateISO(raw);
              const m = String(raw || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
              const ddmmyyyy = m ? `${m[3]}-${m[2]}-${m[1]}` : '';
              setDate(ddmmyyyy);
            }} />
          </label>
          <label>
            File
            <input type="file" accept="application/pdf" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setOpenUpload(false);
              // View-only tray items: we feed a single item with external progress updates
              const item = { id: `${Date.now()}`, name: file.name, pct: 0, status: 'queued' };
              setTrayItems([item]);
              try {
                const { promise } = uploadWithProgress(date, file, (pct) => setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, pct, status: pct >= 100 ? 'processing' : 'uploading' } : x)));
                await promise;
                setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, pct: 100, status: 'done' } : x));
                const updated = await getGroupForDate(date);
                setGroups(prev => {
                  const others = prev.filter(g => g.date !== updated.date);
                  return applyFilter([updated, ...others], filter);
                });
              } catch (e) {
                setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'error' } : x));
              } finally {
                // keep tray visible; user can close when done
              }
            }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setOpenUpload(false)}>Close</button>
          </div>
        </div>
      </Modal>

      <UploadTray
        open={openUpload || trayItems.length > 0}
        onClose={() => setOpenUpload(false)}
        onItemDone={async (dateStr) => {
          const updated = await getGroupForDate(dateStr);
          setGroups(prev => {
            const others = prev.filter(g => g.date !== updated.date);
            return applyFilter([updated, ...others], filter);
          });
        }}
        items={trayItems}
        onAllDone={(names) => {
          setToast({ visible: true, message: names.length === 1 ? `${names[0]} uploaded successfully` : `${names.length} files uploaded successfully` });
          // hide tray items after success
          setTimeout(() => setTrayItems([]), 400);
          // auto-hide toast
          setTimeout(() => setToast({ visible: false, message: '' }), 3000);
        }}
      />
      <Toast message={toast.message} visible={toast.visible} />
      <LoadingOverlay open={loading} label={loadingLabel} />
    </div>
  );
}


