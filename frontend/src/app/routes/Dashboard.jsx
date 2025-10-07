import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { startGoogleLogin, tryReadTokensFromCallbackPayload, logoutGoogle } from '../../lib/auth';
import { setTokens, getTokens } from '../../state/authStore';
import { listAllGrouped, uploadWithProgress, deleteFile, getGroupForDate } from '../../lib/drive';
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
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const profileMenuRef = useRef(null);
  const profileBtnRef = useRef(null);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 });
  const dateFilterRef = useRef(null);

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
          // Set all dates as expanded by default
          const allDates = new Set(g.map(group => group.date));
          setExpandedDates(allDates);
        } finally { setLoading(false); }
      }
    })();
  }, []);

  // Always get latest tokens for profile info
  const tokens = getTokens();

  // Handle click outside profile menu and date filter to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openProfile && profileMenuRef.current && !profileMenuRef.current.contains(event.target) && profileBtnRef.current && !profileBtnRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setShowDateFilter(false);
      }
    };

    if (openProfile || showDateFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openProfile, showDateFilter]);

  // When opening profile menu, calculate its position
  useEffect(() => {
    if (openProfile && profileBtnRef.current) {
      const rect = profileBtnRef.current.getBoundingClientRect();
      setProfileMenuPos({
        top: rect.bottom + 8, // 8px gap
        left: rect.right - 200, // align right edge, menu minWidth is 200px
      });
    }
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

  function applySearch(groupsIn, searchTerm) {
    if (!searchTerm.trim()) return groupsIn;
    return groupsIn.map(group => ({
      ...group,
      files: group.files.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.files.length > 0);
  }

  function toggleDateExpansion(date) {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  }

  function formatDateForDisplay(dateStr) {
    const [d, m, y] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  if (!tokens.accessToken) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Dashboard</h2>
        <button onClick={startGoogleLogin}>Sign in with Google</button>
      </div>
    );
  }

  const filteredGroups = applySearch(applyFilter(groups, filter), search);

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#E5FBFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#374151',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '24px 32px',
        background: '#E5FBFF',
        width: 'calc(100% - 120px)',
        marginLeft: 0,
        marginRight: '120px',
      }}>
        {/* Left: Title */}
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#374151',
          margin: 0,
        }}>
          Digital News Library
        </h1>

        {/* Center Group: Search + Filter */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
      <div style={{
            position: 'relative',
        display: 'flex',
        alignItems: 'center',
            background: '#B8E6F0',
            borderRadius: '16px',
            padding: '12px 16px',
            width: '50%',
            maxWidth: '720px',
            minWidth: '420px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', color: '#6B7280' }}>
              <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search in Library"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px',
                color: '#374151',
                width: '100%',
              }}
            />
          </div>

          {/* Filter Button right next to search */}
          <div style={{ display: 'flex', alignItems: 'center' }} ref={dateFilterRef}>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            style={{
              background: '#B8E6F0',
            border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
            cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              color: '#0F172A',
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            }}
            title="Filter"
            aria-label="Open filter options"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ display: 'block', transform: 'translate(-9px)' }}>
              <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" fill="currentColor" />
            </svg>
          </button>
          {showDateFilter && (
            <div style={{
              position: 'absolute',
              top: '76px',
              // aligns under the filter button
              transform: 'translateX(-60px)',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '8px 0',
              minWidth: '160px',
              zIndex: 9998,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {['All', 'Today', 'Last 7 days', 'This month'].map((option) => (
                <button
                  key={option}
                  onClick={async () => {
                    setFilter(option);
                    setShowDateFilter(false);
            const all = await listAllGrouped();
                    setGroups(applyFilter(all, option));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: filter === option ? '#3B82F6' : '#374151',
                    fontWeight: filter === option ? 500 : 400,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Close Center Group */}
        </div>

        {/* Right: Upload + Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifySelf: 'end', transform: 'translateX(var(--profile-right-shift, 0px))' }}>
          {/* Upload Button */}
          <button
            onClick={() => setOpenUpload(true)}
            style={{
              background: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Upload
          </button>
          
          {/* Profile Icon */}
          <div style={{ position: 'relative' }}>
            <button
              ref={profileBtnRef}
              onClick={() => setOpenProfile(!openProfile)}
              style={{
                background: '#B8E6F0',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              {tokens?.username ? tokens.username[0].toUpperCase() : 'U'}
            </button>
            {openProfile && createPortal(
              <div
                ref={profileMenuRef}
                style={{
                  position: 'fixed',
                  top: profileMenuPos.top,
                  left: profileMenuPos.left,
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '12px 0',
                  minWidth: '200px',
                  zIndex: 10000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ padding: '0 16px 8px', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                    {tokens?.username || 'User Name'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {tokens?.email || 'user@email.com'}
                  </div>
                </div>
                <button style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}>
                  Settings
                </button>
                <button
                  onClick={async () => {
                    setLoadingLabel('Signing out...');
                    setLoading(true);
                    await logoutGoogle();
                    localStorage.removeItem('googleTokens');
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#DC2626',
                  }}
                >
                  Logout
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1,
        background: '#FFFFFF',
        width: 'calc(100% - 70px)',
        marginLeft: 0,
        marginRight: '120px',
        borderRadius: '0 16px 0 0',
        border: '1px solid #E5E7EB',
        position: 'relative',
        overflow: 'visible',
      }}>

        {/* Scrollable Content */}
        <div className="main-scroll" style={{
          height: '100%',
          overflow: 'auto',
          padding: '24px',
          paddingTop: '80px',
        }}>
          {filteredGroups.length === 0 ? (
            <div style={{
              textAlign: 'center',
              marginTop: '60px',
              fontSize: '16px',
              color: '#6B7280',
            }}>
              {search ? 'No files found matching your search.' : 'No files yet. Upload your first PDF.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {filteredGroups.map((group) => (
                <div key={group.date} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Date Header */}
                  <button
                    onClick={() => toggleDateExpansion(group.date)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 0',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{
                        transform: expandedDates.has(group.date) ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {formatDateForDisplay(group.date)}
                  </button>

                  {/* Files Grid */}
                  {expandedDates.has(group.date) && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '20px',
                      marginLeft: '24px',
                    }}>
                      {group.files.map((file) => (
                        <div
                          key={file.fileId}
                          style={{
                            background: '#F9FAFB',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid #E5E7EB',
                            position: 'relative',
                          }}
                        >
                          {/* Three-dot menu */}
                          <button
                            style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              color: '#6B7280',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="5" r="2" fill="currentColor"/>
                              <circle cx="12" cy="12" r="2" fill="currentColor"/>
                              <circle cx="12" cy="19" r="2" fill="currentColor"/>
                            </svg>
                          </button>

                          {/* Times of India label */}
                          <div style={{
                            fontSize: '12px',
                            color: '#6B7280',
                            marginBottom: '8px',
                            fontWeight: 500,
                          }}>
                            Times of India
                          </div>

                          {/* Newspaper Preview */}
                          <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '12px',
                            border: '1px solid #E5E7EB',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                          }}>
                            <div style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: '#111827',
                              marginBottom: '8px',
                              fontFamily: 'serif',
                            }}>
                              DAILY NEWS
                            </div>
                            <div style={{
                              fontSize: '14px',
                              color: '#6B7280',
                              marginBottom: '16px',
                            }}>
                              Your headline
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: '#9CA3AF',
                              lineHeight: '1.4',
                              textAlign: 'left',
                              width: '100%',
                            }}>
                              <div style={{ marginBottom: '4px' }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
                              <div style={{ marginBottom: '4px' }}>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
                              <div style={{ marginBottom: '4px' }}>Ut enim ad minim veniam, quis nostrud exercitation.</div>
                              <div>Duis aute irure dolor in reprehenderit in voluptate velit esse.</div>
                            </div>
                          </div>

                          {/* File name */}
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#111827',
                            marginBottom: '12px',
                            wordBreak: 'break-word',
                          }}>
                            {file.name}
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => window.open(`${window.location.origin}/#/viewer/${file.fileId}`, '_blank')}
                              style={{
                                flex: 1,
                                background: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Open
                            </button>
                            <button
                              onClick={async () => {
                const ok = confirm('Delete this file?');
                if (!ok) return;
                await deleteFile(file.fileId);
                                const updated = await getGroupForDate(file.folderDate || group.date);
                setGroups(prev => {
                  const others = prev.filter(g => g.date !== updated.date);
                  return applyFilter([updated, ...others], filter);
                });
              }}
                              style={{
                                flex: 1,
                                background: 'transparent',
                                color: '#DC2626',
                                border: '1px solid #DC2626',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
        </div>
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


