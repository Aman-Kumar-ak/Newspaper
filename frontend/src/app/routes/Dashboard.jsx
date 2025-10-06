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
  const tokens = getTokens();
  const profileMenuRef = useRef(null);

  useEffect(() => {
    // On mount, capture tokens from URL hash (after OAuth) and load data
    const t = tryReadTokensFromCallbackPayload();
    if (t) setTokens(t);
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
      overflow: 'hidden'
    }}>
      {/* Fixed Header */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button title="Profile" onClick={() => setOpenProfile(v => !v)}>A</button>
            {openProfile && (
              <div style={{ position: 'absolute', top: 36, left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, width: 240, zIndex: 20 }}>
                <div style={{ fontWeight: 700 }}>Aman kumar</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>lifepointsaman@gmail.com</div>
                <div style={{ marginTop: 8 }}>
                  <button style={{ color: '#ef4444' }} onClick={() => { setLoadingLabel('Signing out...'); setLoading(true); logoutGoogle(); }}>Log out</button>
                </div>
              </div>
            )}
          </div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filter} onChange={async (e) => {
              const v = e.target.value;
              setFilter(v);
              const all = await listAllGrouped();
              setGroups(applyFilter(all, v));
            }}>
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="Last7">Last 7 days</option>
              <option value="ThisMonth">This month</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px auto 0', maxWidth: 1100 }}>
          <button onClick={() => setOpenUpload(true)}>Upload PDF</button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        minHeight: 0, // Important for flex child to allow scrolling
        WebkitOverflowScrolling: 'touch' // Smooth scrolling on mobile
      }}>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>No files yet. Upload your first PDF.</div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: '20px' }}>
            <FolderList
              groups={groups}
              search={search}
              onOpen={(file) => {
                // Navigate to PDF viewer with file ID
                window.location.hash = `#/viewer/${file.fileId}`;
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


