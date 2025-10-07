import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { startGoogleLogin, tryReadTokensFromCallbackPayload, logoutGoogle } from '../../lib/auth';
import { setTokens, getTokens } from '../../state/authStore';
import { listAllGrouped, listAllGroupedProgressive, uploadWithProgress, deleteFile, getGroupForDate, checkFolderExists } from '../../lib/drive';
import Modal from '../../components/ui/Modal.jsx';
import UploadTray from '../../components/ui/UploadTray.jsx';
import Toast from '../../components/ui/Toast.jsx';
import LoadingOverlay from '../../components/ui/LoadingOverlay.jsx';
import PdfThumbnail from '../../components/pdf/PdfThumbnail.jsx';

// Helper function for navigation
const navigateTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export default function Dashboard() {
  const [date, setDate] = useState(''); // DD-MM-YYYY for backend
  const [dateISO, setDateISO] = useState(''); // YYYY-MM-DD for <input type="date">
  const [file, setFile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [specificDate, setSpecificDate] = useState('');
  const [openProfile, setOpenProfile] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [trayItems, setTrayItems] = useState([]);
  
  // Set current date when upload modal opens
  useEffect(() => {
    if (openUpload && !dateISO) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const isoDate = `${yyyy}-${mm}-${dd}`;
      setDateISO(isoDate);
      setDate(`${dd}-${mm}-${yyyy}`);
    }
  }, [openUpload]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Fetching latest files...');
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For progressive loading indicator
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Uploading');
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [openMenuFileId, setOpenMenuFileId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { fileId, fileName }
  const [sessionExpired, setSessionExpired] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState(5);
  const profileMenuRef = useRef(null);
  const profileBtnRef = useRef(null);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 });
  const dateFilterRef = useRef(null);
  const menuRef = useRef(null);

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
    
    // Check if user is authenticated, redirect to login if not
    const existing = getTokens();
    if (!existing.accessToken && !t?.accessToken) {
      console.warn('⚠️ No authentication token found. Redirecting to login...');
      navigateTo('/login');
      return;
    }
    
    // If already signed in but profile fields are missing, fetch them
    (async () => {
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
        await loadGroupsProgressively(true);
      }
    })();
  }, []);

  // Always get latest tokens for profile info
  const tokens = getTokens();

  // Auto-redirect timer for session expired modal
  useEffect(() => {
    let timer;
    if (sessionExpired && redirectTimer > 0) {
      timer = setInterval(() => {
        setRedirectTimer(prev => prev - 1);
      }, 1000);
    } else if (sessionExpired && redirectTimer === 0) {
      navigateTo('/login');
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionExpired, redirectTimer]);

  // Reset timer when modal opens
  useEffect(() => {
    if (sessionExpired) {
      setRedirectTimer(5);
    }
  }, [sessionExpired]);

  // Handle click outside profile menu and date filter to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openProfile && profileMenuRef.current && !profileMenuRef.current.contains(event.target) && profileBtnRef.current && !profileBtnRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setShowDateFilter(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuFileId(null);
      }
    };

    if (openProfile || showDateFilter || openMenuFileId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openProfile, showDateFilter, openMenuFileId]);

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

  // Helper function to load groups progressively
  async function loadGroupsProgressively(fresh = false) {
    setIsLoadingMore(true);
    if (fresh) {
      setLoading(true);
      setLoadingLabel('Fetching latest files...');
    }
    
    try {
      const groupsMap = new Map();
      let loadedCount = 0;
      
      for await (const group of listAllGroupedProgressive({ fresh })) {
        loadedCount++;
        groupsMap.set(group.date, group);
        
        // Convert map to array and update state
        const currentGroups = Array.from(groupsMap.values());
        setGroups(applyFilter(currentGroups, filter));
        
        // Expand newly loaded dates
        setExpandedDates(prev => new Set([...prev, group.date]));
        
        // Hide full-screen loading after first group loads
        if (loadedCount === 1 && fresh) {
          setLoading(false);
        }
        
        // Update loading label to show progress
        setLoadingLabel(`Loading folders... (${loadedCount} loaded)`);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setSessionExpired(true);
      }
    } finally { 
      setLoading(false); 
      setIsLoadingMore(false);
    }
  }

    function applyFilter(groupsIn, f, specificDateValue = '') {
    if (f === 'All') return groupsIn;
    const now = new Date();
    const isInRange = (dateStr) => {
      const [d, m, y] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (f === 'Today') return dt.toDateString() === now.toDateString();
      if (f === 'Last7') return (now - dt) / 86400000 <= 7;
      if (f === 'ThisMonth') return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      if (f === 'Specific' && specificDateValue) {
        // Convert YYYY-MM-DD to DD-MM-YYYY for comparison
        const [year, month, day] = specificDateValue.split('-');
        const formattedDate = `${day}-${month}-${year}`;
        return dateStr === formattedDate;
      }
      return true;
    };
    return groupsIn.filter(g => isInRange(g.date));
  }

  function sortByDate(groupsIn) {
    return [...groupsIn].sort((a, b) => {
      const [dA, mA, yA] = a.date.split('-').map(Number);
      const [dB, mB, yB] = b.date.split('-').map(Number);
      const dateA = new Date(yA, mA - 1, dA);
      const dateB = new Date(yB, mB - 1, dB);
      return dateB - dateA; // Newest first
    });
  }

  function applySearch(groupsIn, searchTerm) {
    if (!searchTerm.trim()) return groupsIn;
    return groupsIn.map(group => ({
      ...group,
      files: (group.files || []).filter(file => {
        const fileName = file.fileName || file.name || '';
        return fileName.toLowerCase().includes(searchTerm.toLowerCase());
      })
    })).filter(group => group.files && group.files.length > 0);
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

  const filteredGroups = sortByDate(applySearch(applyFilter(groups, filter), search));

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
        <h1 
          onClick={() => navigateTo('/home')}
          style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#374151',
          margin: 0,
            cursor: 'pointer',
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
              transform: 'translateX(-60px)',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '4px 0',
              minWidth: '110px',
              zIndex: 9998,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {['All', 'Today', 'Last 7 days', 'This month'].map((option) => (
                <button
                  key={option}
                  onClick={async () => {
                    setFilter(option);
                    setSpecificDate('');
                    setShowDateFilter(false);
                    const all = await listAllGrouped();
                    setGroups(applyFilter(all, option));
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: filter === option ? '#3B82F6' : '#374151',
                    fontWeight: filter === option ? 500 : 400,
                  }}
                >
                  {option}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #F3F4F6', margin: '4px 0' }} />
              <div style={{ padding: '6px 10px' }}>
                <input
                  type="date"
                  value={specificDate}
                  onChange={async (e) => {
                    const selectedDate = e.target.value;
                    setSpecificDate(selectedDate);
                    if (selectedDate) {
                      setFilter('Specific');
                      const all = await listAllGrouped();
                      setGroups(applyFilter(all, 'Specific', selectedDate));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                  placeholder="Select date"
                />
              </div>
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
                <button 
                  onClick={() => {
                    navigateTo('/settings');
                  }}
                  style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    navigateTo('/privacy-policy');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => {
                    navigateTo('/terms-and-conditions');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Terms & Conditions
                </button>
                <button
                  onClick={async () => {
                    setLoadingLabel('Signing out...');
                    setLoading(true);
                    await logoutGoogle();
                    localStorage.removeItem('googleTokens');
                    navigateTo('/login');
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
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* Scrollable Content */}
        <div className="main-scroll" style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
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
              {filteredGroups.filter(group => group.files && group.files.length > 0).map((group) => (
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
                      outline: 'none',
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
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '20px',
                      marginLeft: '24px',
                    }}>
                      {group.files.map((file) => (
                        <div
                          key={file.fileId}
                          onClick={() => {
                            const fileName = encodeURIComponent(file.fileName || 'document.pdf');
                            window.open(`${window.location.origin}/viewer/${file.fileId}?name=${fileName}`, '_blank');
                          }}
                          style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '0',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            border: '1px solid #F3F4F6',
                            position: 'relative',
                            cursor: 'pointer',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Three-dot menu */}
                          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 20 }} ref={openMenuFileId === file.fileId ? menuRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFileId(openMenuFileId === file.fileId ? null : file.fileId);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '6px',
                                color: '#6B7280',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.color = '#1F2937';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                                e.currentTarget.style.color = '#6B7280';
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="5" r="2" fill="currentColor"/>
                                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                                <circle cx="12" cy="19" r="2" fill="currentColor"/>
                              </svg>
                            </button>
                            
                            {openMenuFileId === file.fileId && (
                              <div style={{
                                position: 'absolute',
                                top: '40px',
                                right: '0',
                                background: 'white',
                                border: '1px solid #F3F4F6',
                                borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                                minWidth: '140px',
                                zIndex: 100,
                                overflow: 'hidden',
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuFileId(null);
                                    setDeleteConfirm({ fileId: file.fileId, fileName: file.fileName || file.name || 'Untitled', date: group.date });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#DC2626',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>

                          {/* PDF Thumbnail Preview */}
                          <div style={{
                            width: '100%',
                            aspectRatio: '1',
                            overflow: 'hidden',
                            background: '#F9FAFB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <PdfThumbnail fileId={file.fileId} fileName={file.fileName || file.name} />
                          </div>

                          {/* File info section */}
                          <div style={{
                            padding: '14px 16px',
                            background: 'linear-gradient(to bottom, white, #FAFBFC)',
                          }}>
                            {/* File name */}
                            <div style={{
                              fontSize: '13px',
                              color: '#1F2937',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px',
                              letterSpacing: '-0.01em',
                            }}>
                              {file.fileName || file.name || 'Untitled'}
                            </div>
                            
                            {/* File type badge */}
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#DC2626',
                              fontWeight: 600,
                              background: '#FEF2F2',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              letterSpacing: '0.02em',
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <path d="M14 2v6h6"/>
                                <path d="M9 13h6M9 17h6"/>
                              </svg>
                              PDF
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
        
        {/* Progressive loading indicator */}
        {isLoadingMore && filteredGroups.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '32px',
            fontSize: '14px',
            color: '#6B7280',
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #E5E7EB',
              borderTopColor: '#3B82F6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span>Loading more folders...</span>
          </div>
        )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {openUpload && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 50 
          }}
          onClick={() => {
            setOpenUpload(false);
            setFile(null);
            setDate('');
            setDateISO('');
          }}
        >
          <div 
            style={{ 
              width: 480, 
              maxWidth: '90%', 
              background: '#FFFFFF', 
              borderRadius: '16px', 
              padding: '32px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 24px 0', 
              fontSize: '20px', 
              fontWeight: 600, 
              color: '#111827' 
            }}>Upload PDF</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>Date</label>
                <input 
                  type="date" 
                  value={dateISO} 
                  onChange={e => {
                    const raw = e.target.value;
                    setDateISO(raw);
                    const m = String(raw || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    const ddmmyyyy = m ? `${m[3]}-${m[2]}-${m[1]}` : '';
                    setDate(ddmmyyyy);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#374151',
                    outline: 'none',
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>File</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    id="file-upload"
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: file ? '#374151' : '#9CA3AF',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {file ? file.name : 'No file chosen'}
                    </span>
                    <button
                      type="button"
                      style={{
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        marginLeft: '12px',
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('file-upload').click();
                      }}
                    >
                      Choose File
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setOpenUpload(false);
                    setFile(null);
                    setDate('');
                    setDateISO('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#FFFFFF',
                    color: '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!date || !file}
                  onClick={async () => {
                    if (!date || !file) return;
                    setOpenUpload(false);
                    const item = { id: `${Date.now()}-${Math.random()}`, name: file.name, pct: 0, status: 'checking' };
                    setTrayItems(prev => [...prev, item]);
                    
                    try {
                      // Check if folder exists
                      const folderExists = await checkFolderExists(date);
                      
                      if (!folderExists) {
                        // Show folder creation status
                        setTrayItems(prev => prev.map(x => x.id === item.id ? 
                          { ...x, pct: 0, status: 'creating-folder' } : x
                        ));
                        // Simulate folder creation progress (0-50%)
                        await new Promise(resolve => setTimeout(resolve, 100));
                        setTrayItems(prev => prev.map(x => x.id === item.id ? 
                          { ...x, pct: 25, status: 'creating-folder' } : x
                        ));
                      }
                      
                      // Start upload
                      const { promise } = uploadWithProgress(date, file, (pct) => {
                        setTrayItems(prev => prev.map(x => x.id === item.id ? 
                          { ...x, pct, status: pct >= 100 ? 'processing' : 'uploading' } : x
                        ));
                      }, folderExists);
                      
                      await promise;
                      setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, pct: 100, status: 'done' } : x));
                      const updated = await getGroupForDate(date);
                      setGroups(prev => {
                        const others = prev.filter(g => g.date !== updated.date);
                        return sortByDate(applyFilter([updated, ...others], filter));
                      });
                    } catch (e) {
                      console.error('Upload error:', e);
                      setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'error' } : x));
                      
                      // Show authentication error modal if 401
                      if (e.message.includes('Authentication failed') || e.message.includes('Not authenticated')) {
                        setSessionExpired(true);
                      } else {
                        setToast({ visible: true, message: 'Upload failed: ' + (e.message || 'Unknown error'), type: 'error' });
                      }
                    }
                    setFile(null);
                    setDate('');
                    setDateISO('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: (!date || !file) ? '#E5E7EB' : '#3B82F6',
                    color: (!date || !file) ? '#9CA3AF' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!date || !file) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UploadTray
        items={trayItems}
        onClose={() => setTrayItems([])}
        onAllDone={(names) => {
          setToast({ visible: true, message: names.length === 1 ? `${names[0]} uploaded successfully` : `${names.length} files uploaded successfully` });
          setTimeout(() => setTrayItems([]), 1500);
          setTimeout(() => setToast({ visible: false, message: '' }), 3000);
        }}
      />
      <Toast message={toast.message} visible={toast.visible} />
      <LoadingOverlay open={loading} label={loadingLabel} />
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100 
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            style={{ 
              width: 420, 
              maxWidth: '90%', 
              background: '#FFFFFF', 
              borderRadius: '16px', 
              padding: '32px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: 600, 
              color: '#111827' 
            }}>Delete File</h3>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.5',
            }}>
              This file <strong style={{ color: '#374151' }}>"{deleteConfirm.fileName}"</strong> will be deleted. This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { fileId, date } = deleteConfirm;
                  setDeleteConfirm(null);
                  setLoadingLabel('Deleting file...');
                  setLoading(true);
                  try {
                    await deleteFile(fileId);
                    const updated = await getGroupForDate(date);
                    setGroups(prev => {
                      const others = prev.filter(g => g.date !== updated.date);
                      return sortByDate(applyFilter([updated, ...others], filter));
                    });
                    setToast({ visible: true, message: 'File deleted successfully' });
                    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
                  } catch (e) {
                    console.error('Delete error:', e);
                    // Check if it's an authentication error
                    if (e.message?.includes('401') || e.message?.includes('Unauthorized') || e.message?.includes('Authentication failed')) {
                      setSessionExpired(true);
                    } else {
                      setToast({ visible: true, message: 'Failed to delete file' });
                      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Expired Modal */}
      {sessionExpired && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'modalSlideIn 0.3s ease-out',
          }}>
            {/* Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1F2937',
              textAlign: 'center',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}>
              Session Expired
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: '1.6',
              marginBottom: '8px',
            }}>
              Your session has expired. Please log in again to continue using the Digital News Library.
            </p>

            {/* Timer message */}
            <p style={{
              fontSize: '12px',
              color: '#9CA3AF',
              textAlign: 'center',
              marginBottom: '28px',
            }}>
              Redirecting in {redirectTimer} second{redirectTimer !== 1 ? 's' : ''}...
            </p>

            {/* Button */}
            <button
              onClick={() => {
                setSessionExpired(false);
                navigateTo('/login');
              }}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              Go to Login Now
            </button>
          </div>

          <style>{`
            @keyframes modalSlideIn {
              from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}


