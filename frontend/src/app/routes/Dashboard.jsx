// ...existing imports...

// Always expand the top (most recent) date group
// (This must be placed after imports and inside the Dashboard component)

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { startGoogleLogin, tryReadTokensFromCallbackPayload, logoutGoogle } from '../../lib/auth';
import { setTokens, getTokens } from '../../state/authStore';
import { listAllGrouped, listAllGroupedProgressive, uploadWithProgress, deleteFile, deleteFolderByDate, getGroupForDate, checkFolderExists, getFileBytes } from '../../lib/drive';
import Modal from '../../components/ui/Modal.jsx';
import UploadTray from '../../components/ui/UploadTray.jsx';
import Toast from '../../components/ui/Toast.jsx';
import LoadingOverlay from '../../components/ui/LoadingOverlay.jsx';
import PdfThumbnail from '../../components/pdf/PdfThumbnail.jsx';
import ThumbnailPreloader from '../../components/pdf/ThumbnailPreloader.jsx';
import { useDriveCache } from '../../hooks/DriveCacheContext';
import { cacheSetPdf, cacheGetPdf, cacheGetAllPdfIds } from '../../lib/idb';
// Importing useDriveCache from the correct path
// The file extension .jsx is not necessary when importing modules in JavaScript

// Helper function for navigation
const navigateTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export default function Dashboard() {
  const { groups: cachedGroups, setGroups: setCacheGroups, loading: cacheLoading, fetchDrive, invalidate } = useDriveCache();
  // groups: null = not loaded, [] = loaded but empty, [..] = loaded
  const [groups, setGroups] = useState(null); // null = not loaded, [] = loaded but empty
  const [date, setDate] = useState(''); // DD-MM-YYYY for backend
  const [dateISO, setDateISO] = useState(''); // YYYY-MM-DD for <input type="date">
  const [file, setFile] = useState(null);
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [specificDate, setSpecificDate] = useState('');
  const [openProfile, setOpenProfile] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openUploadProgress, setOpenUploadProgress] = useState(false);
  const [trayItems, setTrayItems] = useState([]);
  
  // Set current date when upload modal opens
  // Error state for API/data loading
  const [fatalError, setFatalError] = useState(null);

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
  const [loading, setLoading] = useState(true); // Start as true for initial load
  const [loadingLabel, setLoadingLabel] = useState('Loading your files...');
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For progressive loading indicator
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Uploading');
  
  // Process individual uploads independently
  const processUpload = async (item) => {
    try {
      // Check if folder exists
      const folderExists = await checkFolderExists(item.date);
      
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
      const { promise } = uploadWithProgress(item.date, item.file, (pct) => {
        setTrayItems(prev => prev.map(x => x.id === item.id ? 
          { ...x, pct, status: pct >= 100 ? 'processing' : 'uploading' } : x
        ));
      }, folderExists);
      
      await promise;
      setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, pct: 100, status: 'done' } : x));
      
      // Update the groups for this specific date
      const updated = await getGroupForDate(item.date);
      setGroups(prev => {
        const others = prev.filter(g => g.date !== updated.date);
        return sortByDate(applyFilter([updated, ...others], filter));
      });
    } catch (e) {
      console.error('Upload error for file:', item.name, e);
      setTrayItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'error' } : x));
      
      // Show authentication error modal if 401
      if (e.message.includes('Authentication failed') || e.message.includes('Not authenticated')) {
        setSessionExpired(true);
      } else {
        // Only show toast for the first error to avoid spam
        setTrayItems(prev => {
          const hasOtherErrors = prev.some(x => x.id !== item.id && x.status === 'error');
          if (!hasOtherErrors) {
            setToast({ visible: true, message: `Upload failed: ${e.message || 'Unknown error'}`, type: 'error' });
            setTimeout(() => setToast({ visible: false, message: '' }), 2000);
          }
          return prev;
        });
      }
    }
  };
  // Persistent expandedDates: restore from sessionStorage, else empty
  const [expandedDates, setExpandedDates] = useState(() => {
    const saved = sessionStorage.getItem('expandedDates');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [openMenuFileId, setOpenMenuFileId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { fileId, fileName }
  const [sessionExpired, setSessionExpired] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState(5);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineFiles, setOfflineFiles] = useState(new Set());
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Utility function to truncate file names for notifications
  const truncateFileName = (fileName, maxLength = 20) => {
    if (!fileName) return 'Untitled';
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength) + '...';
  };
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
    // BUT allow offline mode if user has cached data or is offline
    const existing = getTokens();
    const isOffline = !navigator.onLine;
    const hasCachedData = cachedGroups && Array.isArray(cachedGroups) && cachedGroups.length > 0;
    
    if (!existing.accessToken && !t?.accessToken && !isOffline && !hasCachedData) {
      console.warn('⚠️ No authentication token found. Redirecting to login...');
      navigateTo('/login');
      return;
    }

    // Track online/offline status
    const handleOnline = () => {
      console.log('🌐 Network is back online!');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('📴 Network went offline');
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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

    // Optimized: fetch only the top date group first, then load the rest in background
    // If nothing loaded yet, show loading until we have cache or fresh data
    if (groups === null) {
      if (cachedGroups && Array.isArray(cachedGroups)) {
        console.log('[Dashboard] Using cached data for offline user');
        setGroups(cachedGroups);
        setLoading(false);
        // Start background refresh for latest data only if online
        if (navigator.onLine && existing.accessToken) {
          (async () => {
            try {
              setLoadingLabel('Checking for new files...');
              const allGroups = await fetchDrive({ fresh: true });
              if (Array.isArray(allGroups)) {
                setGroups(allGroups);
              }
            } catch (e) {
              // Only show error if no cache
              if (!cachedGroups || !cachedGroups.length) {
                setFatalError('Failed to load your files. Please check your connection or try again.');
              }
            } finally {
              setLoading(false);
            }
          })();
        }
      } else if (navigator.onLine && existing.accessToken) {
        // No cache, fetch fresh (only if online)
        (async () => {
          try {
            setLoading(true);
            setLoadingLabel('Loading your files...');
            const allGroups = await fetchDrive({ fresh: true });
            setGroups(Array.isArray(allGroups) ? allGroups : []);
          } catch (e) {
            console.error('Failed to fetch files:', e);
            if (e.message === 'OFFLINE' || !navigator.onLine) {
              // Offline error - just show empty state
              setGroups([]);
              setLoading(false);
            } else {
              setFatalError('Failed to load your files. Please check your connection or try again.');
            }
          } finally {
            setLoading(false);
          }
        })();
      } else {
        // Offline and no cache - try to load from localStorage as fallback
        console.log('[Dashboard] Offline with no cache - checking localStorage fallback');
        try {
          const cached = localStorage.getItem('cachedGroups');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[Dashboard] Found cached data in localStorage for offline user');
              setGroups(parsed);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.log('[Dashboard] No cached data found in localStorage');
        }
        
        // No cache found - show empty state with helpful message
        console.log('[Dashboard] Offline with no cache - showing empty state');
        setGroups([]);
        setLoading(false);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line
  }, [cachedGroups]);

  // Refetch data when coming back online
  useEffect(() => {
    if (isOnline && groups !== null) {
      const existing = getTokens();
      if (existing.accessToken) {
        console.log('🔄 Back online - refreshing data...');
        (async () => {
          try {
            setLoadingLabel('Refreshing data...');
            const allGroups = await fetchDrive({ fresh: true });
            if (Array.isArray(allGroups)) {
              setGroups(allGroups);
              console.log('✅ Data refreshed successfully');
            }
          } catch (e) {
            console.error('Failed to refresh data after coming online:', e);
            // Keep showing cached data if refresh fails
          }
        })();
      }
    }
    // eslint-disable-next-line
  }, [isOnline]);

  // Check which files are available offline - runs on mount and when groups change
  useEffect(() => {
    const checkOfflineFiles = async () => {
      try {
        // Always get all cached PDF IDs from IndexedDB
        const cachedIds = await cacheGetAllPdfIds();
        const offlineSet = new Set(cachedIds);
        setOfflineFiles(offlineSet);
        console.log('[Dashboard] Found offline files:', cachedIds);
      } catch (e) {
        console.error('[Dashboard] Error checking offline files:', e);
      }
    };
    checkOfflineFiles();
  }, [groups]); // Re-check when groups change

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

  const handleMakeOffline = async (fileId, fileName) => {
    setOpenMenuFileId(null);
    
    // Add to downloading set
    setDownloadingFiles(prev => new Set([...prev, fileId]));
    
    try {
      const { bytes, fileName: responseName } = await getFileBytes(fileId);
      await cacheSetPdf(fileId, bytes, responseName || fileName);
      
      // Remove from downloading and add to offline
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      setOfflineFiles(prev => new Set([...prev, fileId]));
      setToast({ visible: true, message: `"${truncateFileName(fileName)}" made offline`, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
    } catch (e) {
      // Remove from downloading on error
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      setToast({ visible: true, message: 'Failed to save file for offline use', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
    }
  };

  const handleRemoveOffline = async (fileId, fileName) => {
    setOpenMenuFileId(null);
    try {
      const db = await window.indexedDB.open('newspapers-db', 2);
      db.onsuccess = () => {
        const tx = db.result.transaction('pdfs', 'readwrite');
        tx.objectStore('pdfs').delete(fileId);
        tx.oncomplete = () => {
          setOfflineFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileId);
            return newSet;
          });
          setToast({ visible: true, message: `"${truncateFileName(fileName)}" removed from offline storage`, type: 'success' });
          setTimeout(() => setToast({ visible: false, message: '' }), 2000);
        };
      };
    } catch (e) {
      setToast({ visible: true, message: 'Failed to remove offline file', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
    }
  };

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
    setHasUserInteracted(true); // Mark that user has manually interacted
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      // Persist to sessionStorage
      sessionStorage.setItem('expandedDates', JSON.stringify(Array.from(newSet)));
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

  // Always ensure groups is an array for filtering/sorting
  const safeGroups = Array.isArray(groups) ? groups : [];
  
  // Filter for offline mode: show only files that are available offline
  const offlineFilteredGroups = isOnline ? safeGroups : safeGroups.map(group => ({
    ...group,
    files: (group.files || []).filter(file => offlineFiles.has(file.fileId))
  })).filter(group => group.files && group.files.length > 0);
  
  const filteredGroups = sortByDate(applySearch(applyFilter(offlineFilteredGroups, filter), search));

  // On first mount, expand the top group if none are expanded and user hasn't manually interacted
  useEffect(() => {
    if (filteredGroups.length > 0 && expandedDates.size === 0 && !hasUserInteracted) {
      const topDate = filteredGroups[0].date;
      const newSet = new Set([topDate]);
      setExpandedDates(newSet);
      sessionStorage.setItem('expandedDates', JSON.stringify([topDate]));
    }
  }, [filteredGroups, hasUserInteracted]);

  // On mount, restore expandedDates from sessionStorage (if user navigates back)
  useEffect(() => {
    const saved = sessionStorage.getItem('expandedDates');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          setExpandedDates(new Set(arr));
          setHasUserInteracted(true); // If there's saved state, user has interacted before
        }
      } catch {}
    }
    // Only runs on mount
    // eslint-disable-next-line
  }, []);


  // Show error overlay if fatal error
  if (fatalError) {
    return (
      <LoadingOverlay open={true} label={fatalError}>
        <div style={{ marginTop: 24 }}>
          <button
            style={{
              background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginRight: 12
            }}
            onClick={() => { window.location.href = '/login'; }}
          >
            Log In Again
          </button>
          <button
            style={{
              background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer'
            }}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </LoadingOverlay>
    );
  }

  // Show loading overlay until files/folders are loaded
  if (loading || groups === null) {
    return <LoadingOverlay open={true} label={loadingLabel} />;
  }

  return (
    <div className="dashboard-container" style={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#E5FBFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#374151',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="dashboard-header" style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '24px 32px',
        background: '#E5FBFF',
        width: 'calc(100% - 120px)',
        marginLeft: 0,
        marginRight: '120px',
      }}>
        {/* Mobile: Title + Profile Row (hidden on desktop) */}
        <div className="mobile-title-row" style={{ 
          display: 'none',
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%',
          marginBottom: '12px'
        }}>
          <h1 
            onClick={() => navigateTo('/home')}
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#374151',
              margin: 0,
              cursor: 'pointer',
            }}>
            Digital News Library
          </h1>
          
          {/* Profile Icon for Mobile */}
          <div style={{ position: 'relative' }}>
            <button
              ref={profileBtnRef}
              className="mobile-profile-button"
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
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              {tokens?.username ? tokens.username[0].toUpperCase() : 'U'}
            </button>
          </div>
        </div>

        {/* Desktop: Left Title */}
        <h1 
          onClick={() => navigateTo('/home')}
          className="desktop-title"
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
        <div className="search-filter-group" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
      <div className="search-bar" style={{
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
            className="filter-button"
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
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
            title="Filter"
            aria-label="Open filter options"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ display: 'block', transform: 'translate(-9px)' }}>
              <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" fill="currentColor" />
            </svg>
          </button>
          {showDateFilter && (
            <>
              {/* Backdrop overlay for mobile */}
              <div 
                className="filter-backdrop"
                onClick={() => setShowDateFilter(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 9997,
                  display: 'none', // Hidden by default, shown on mobile via CSS
                }}
              />
              
              <div className="date-filter-dropdown" style={{
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
                {/* Close button for mobile */}
                <div className="filter-header" style={{ 
                  display: 'none', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    Filter
                  </h3>
                  <button
                    onClick={() => setShowDateFilter(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: '#6B7280',
                      padding: '0',
                      lineHeight: 1,
                      outline: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      userSelect: 'none',
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div className="filter-options">
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
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  {option}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #F3F4F6', margin: '4px 0' }} />
              <div className="date-input-container" style={{ padding: '6px 10px' }}>
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
                    background: '#FFFFFF',
                    colorScheme: 'light',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                  }}
                  placeholder="Select date"
                />
              </div>
              </div>
            </div>
            </>
          )}
        </div>
        {/* Close Center Group */}
        </div>

        {/* Right: Upload + Profile */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', justifySelf: 'end', transform: 'translateX(var(--profile-right-shift, 0px))' }}>
          {/* Upload Button - Hide when offline */}
          {isOnline && (
            <button
              className="upload-button desktop-upload"
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
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Upload
            </button>
          )}
          
          {/* Profile Icon */}
          <div style={{ position: 'relative' }}>
            <button
              ref={profileBtnRef}
              className="profile-button"
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
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              {tokens?.username ? tokens.username[0].toUpperCase() : 'U'}
            </button>
            {openProfile && createPortal(
              <>
                {/* Backdrop overlay for mobile */}
                <div 
                  className="profile-menu-backdrop"
                  onClick={() => setOpenProfile(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    display: 'none', // Hidden by default, shown on mobile via CSS
                  }}
                />
                
                <div
                  ref={profileMenuRef}
                  className="profile-menu"
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
                  {/* Close button for mobile */}
                  <div className="profile-menu-header" style={{ 
                    display: 'none', 
                    padding: '12px 16px', 
                    borderBottom: '1px solid #F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                      Profile
                    </h3>
                    <button
                      onClick={() => setOpenProfile(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#6B7280',
                        padding: '0',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="profile-info-section" style={{ padding: '0 16px 8px', borderBottom: '1px solid #F3F4F6' }}>
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
                  className="profile-menu-item"
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
                  className="profile-menu-item"
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
                  className="profile-menu-item"
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
                  className="profile-menu-item"
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
              </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ 
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
              {!isOnline && offlineFiles.size === 0 
                ? 'No offline files available. Please connect to the internet and mark files as "available offline".' 
                : search 
                ? 'No files found matching your search.' 
                : 'No files yet. Upload your first PDF.'}
            </div>
          ) : (
            <div className="date-groups-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {filteredGroups.filter(group => group.files && group.files.length > 0).map((group) => (
                <div key={group.date} className="date-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Date Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    <button
                      className="date-header"
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
                        flex: 1,
                        textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none',
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
                    <button
                      className="delete-folder-btn"
                      title="Delete entire folder"
                      onClick={() => setDeleteConfirm({ folderDate: group.date, folderName: formatDateForDisplay(group.date) })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DC2626',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '8px',
                        fontSize: '16px',
                        transition: 'background 0.2s',
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>

                  {/* Files Grid */}
                  {expandedDates.has(group.date) && (
                    <div className="files-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '20px',
                      marginLeft: '24px',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      {group.files.map((file) => (
                        <div
                          key={file.fileId}
                          className="file-card"
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
                          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 9998 }} ref={openMenuFileId === file.fileId ? menuRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + 4,
                                  left: rect.left - 140,
                                });
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
                                outline: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none',
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
                            
                            {openMenuFileId === file.fileId && createPortal(
                              <div 
                                ref={menuRef}
                                style={{
                                position: 'fixed',
                                top: `${menuPosition.top}px`,
                                left: `${menuPosition.left}px`,
                                background: 'white',
                                border: '1px solid #F3F4F6',
                                borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                                minWidth: '180px',
                                zIndex: 99999,
                                overflow: 'hidden',
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isOnline && !offlineFiles.has(file.fileId)) {
                                      handleMakeOffline(file.fileId, file.fileName || file.name);
                                    }
                                  }}
                                  disabled={!isOnline || offlineFiles.has(file.fileId)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    textAlign: 'left',
                                    cursor: (isOnline && !offlineFiles.has(file.fileId)) ? 'pointer' : 'not-allowed',
                                    fontSize: '13px',
                                    color: (isOnline && !offlineFiles.has(file.fileId)) ? '#2563EB' : '#bbb',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    outline: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                    userSelect: 'none',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (isOnline && !offlineFiles.has(file.fileId)) {
                                      e.currentTarget.style.background = '#EFF6FF';
                                    }
                                  }}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 5v14m7-7H5"/>
                                  </svg>
                                  Make available offline
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (offlineFiles.has(file.fileId)) {
                                      handleRemoveOffline(file.fileId, file.fileName || file.name);
                                    }
                                  }}
                                  disabled={!offlineFiles.has(file.fileId)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    textAlign: 'left',
                                    cursor: offlineFiles.has(file.fileId) ? 'pointer' : 'not-allowed',
                                    fontSize: '13px',
                                    color: offlineFiles.has(file.fileId) ? '#EF4444' : '#bbb',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    outline: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                    userSelect: 'none',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (offlineFiles.has(file.fileId)) {
                                      e.currentTarget.style.background = '#FEF2F2';
                                    }
                                  }}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                  </svg>
                                  Remove from offline
                                </button>
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
                                    outline: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                    userSelect: 'none',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                  </svg>
                                  Delete
                                </button>
                              </div>,
                              document.body
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
                            position: 'relative',
                          }}>
                            <PdfThumbnail fileId={file.fileId} fileName={file.fileName || file.name} />
                            {offlineFiles.has(file.fileId) && (
                              <div style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                background: '#059669',
                                borderRadius: '50%',
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              }} title="Available offline">
                                <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path d="M7 13l3 3 7-7"/>
                                </svg>
                              </div>
                            )}
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
                          </div>

                          {/* Download progress bar */}
                          {downloadingFiles.has(file.fileId) && (
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: '#E5E7EB',
                              borderRadius: '0 0 16px 16px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                                borderRadius: '0 0 16px 16px',
                                animation: 'downloadProgress 1.5s ease-in-out infinite',
                                width: '100%',
                                transform: 'translateX(-100%)',
                              }} />
                            </div>
                          )}
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

      {/* Preload thumbnails for all files (invisible) */}
      <ThumbnailPreloader groups={safeGroups} />

      {/* Floating Mobile Upload Button */}
      {/* Upload Progress Button - shows when uploads are in progress */}
  {trayItems.length > 0 && trayItems.some(item => item.status !== 'done') && !deleteConfirm && !openUpload && (
    <button
      className="mobile-upload-progress-fab"
      onClick={() => setOpenUploadProgress(true)}
      style={{
        position: 'fixed',
        bottom: '90px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'white',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        cursor: 'pointer',
        display: deleteConfirm ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: deleteConfirm ? 'none' : 'scaleIn 0.3s ease',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        {trayItems.filter(item => item.status !== 'done').length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: '#EF4444',
            color: 'white',
            fontSize: '11px',
            fontWeight: '600',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {trayItems.filter(item => item.status !== 'done').length}
          </span>
        )}
      </div>
    </button>
  )}


      {/* Hide upload button when upload popup is open */}
      {/* Hide upload button during any modal/popup (upload, delete, upload progress) or when offline */}
      {isOnline && !(openUpload || deleteConfirm || openUploadProgress) && (
        <button
          className="mobile-upload-fab"
          onClick={() => setOpenUpload(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'transform 0.2s, box-shadow 0.2s',
            animation: 'scaleIn 0.3s ease',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes downloadProgress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes slideUpFromBottom {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        /* Hide mobile elements on desktop */
        .mobile-title-row {
          display: none !important;
        }
        
        .mobile-upload-fab {
          display: none !important;
        }
        
        .mobile-upload-progress-fab {
          display: none !important;
        }
        
        /* Mobile Styles - Apply below 768px */
        @media (max-width: 768px) {
          .dashboard-container {
            background: #E5FBFF !important;
          }
          
          .dashboard-header {
            display: flex !important;
            flex-direction: column !important;
            padding: 16px !important;
            gap: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            grid-template-columns: unset !important;
            align-items: stretch !important;
          }
          
          /* Show mobile title row */
          .mobile-title-row {
            display: flex !important;
            order: 1 !important;
            margin-bottom: 12px !important;
          }
          
          /* Hide desktop title */
          .desktop-title {
            display: none !important;
          }
          
          .search-filter-group {
            order: 2 !important;
            width: 100% !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }
          
          .search-bar {
            flex: 1 !important;
            min-width: unset !important;
            max-width: unset !important;
            width: auto !important;
            padding: 10px 12px !important;
          }
          
          .filter-button {
            flex-shrink: 0 !important;
          }
          
          /* Date Filter Dropdown Mobile Styles */
          .filter-backdrop {
            display: block !important;
            animation: fadeIn 0.3s ease;
          }
          
          .date-filter-dropdown {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            transform: translateY(0) !important;
            width: 100% !important;
            min-width: unset !important;
            max-width: unset !important;
            border-radius: 16px 16px 0 0 !important;
            border: none !important;
            border-top: 1px solid #E5E7EB !important;
            padding: 0 !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15) !important;
            animation: slideUpFromBottom 0.3s ease !important;
            z-index: 9998 !important;
          }
          
          .filter-header {
            display: flex !important;
          }
          
          .filter-options {
            padding: 8px 0 !important;
            max-height: 60vh !important;
            overflow-y: auto !important;
          }
          
          .filter-options button {
            padding: 12px 20px !important;
            font-size: 15px !important;
          }
          
          .date-input-container {
            padding: 12px 20px !important;
          }
          
          .date-input-container input[type="date"] {
            padding: 12px 14px !important;
            font-size: 15px !important;
            border-radius: 8px !important;
            border: 2px solid #E5E7EB !important;
            background: #FFFFFF !important;
            color: #374151 !important;
            color-scheme: light !important;
          }
          
          .filter-options > div[style*="padding"] {
            padding: 12px 20px !important;
          }
          
          .header-actions {
            display: none !important;
          }
          
          .desktop-upload {
            display: none !important;
          }
          
          .mobile-upload-fab {
            display: flex !important;
          }
          
          .mobile-upload-progress-fab {
            display: flex !important;
          }
          
          /* Profile Menu Mobile Side Drawer */
          .profile-menu-backdrop {
            display: block !important;
            animation: fadeIn 0.3s ease;
          }
          
          .profile-menu {
            top: 0 !important;
            left: auto !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 280px !important;
            max-width: 80vw !important;
            min-width: unset !important;
            border-radius: 0 !important;
            border: none !important;
            border-left: 1px solid #E5E7EB !important;
            padding: 0 !important;
            box-shadow: -4px 0 12px rgba(0,0,0,0.15) !important;
            animation: slideInRight 0.3s ease !important;
            overflow-y: auto !important;
          }
          
          .profile-menu-header {
            display: flex !important;
          }
          
          .profile-info-section {
            padding: 16px 20px 12px !important;
          }
          
          .profile-menu-item {
            padding: 14px 20px !important;
            font-size: 15px !important;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .main-content {
            width: 100% !important;
            margin: 0 !important;
            border-radius: 16px 16px 0 0 !important;
            border: none !important;
            border-top: 1px solid #E5E7EB !important;
          }
          
          .main-scroll {
            padding: 16px !important;
            padding-top: 16px !important;
            padding-bottom: 80px !important;
          }
          
          .date-groups-container {
            gap: 8px !important;
          }
          
          .date-group {
            background: #E5FBFF !important;
            padding: 12px !important;
            border-radius: 12px !important;
            gap: 8px !important;
          }
          
          .date-header {
            padding: 4px 0 !important;
            font-size: 15px !important;
            font-weight: 600 !important;
          }
          
          .files-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            margin-left: 0 !important;
          }
          
          .file-card {
            border-radius: 12px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06) !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            padding: 12px !important;
            gap: 12px !important;
          }
          
          .file-card > div:first-of-type {
            position: static !important;
          }
          
          .file-card > div:nth-child(2) {
            width: 80px !important;
            min-width: 80px !important;
            height: 80px !important;
            aspect-ratio: unset !important;
            border-radius: 8px !important;
            flex-shrink: 0 !important;
          }
          
          .file-card > div:nth-child(3) {
            flex: 1 !important;
            padding: 0 !important;
            padding-right: 36px !important;
            background: transparent !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            min-width: 0 !important;
          }
          
          .file-card > div:first-of-type {
            position: absolute !important;
            top: 12px !important;
            right: 12px !important;
          }
          
          /* Upload Modal Mobile Styles */
          .upload-modal-overlay {
            align-items: flex-end !important;
          }
          
          .upload-modal-content {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 16px 16px 0 0 !important;
            padding: 24px 20px !important;
            margin: 0 !important;
          }
          
          /* Delete Modal Mobile Styles */
          .delete-modal-overlay {
            align-items: flex-end !important;
          }
          
          .delete-modal-content {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 16px 16px 0 0 !important;
            padding: 24px 20px 20px !important;
            margin: 0 !important;
            animation: slideUpFromBottom 0.3s ease !important;
          }
          
          .delete-modal-content h3 {
            font-size: 20px !important;
            margin: 0 0 12px 0 !important;
          }
          
          .delete-modal-content p {
            font-size: 15px !important;
            line-height: 1.6 !important;
            margin: 0 0 24px 0 !important;
          }
          
          .delete-modal-buttons {
            flex-direction: column !important;
            gap: 10px !important;
          }
          
          .delete-cancel-btn,
          .delete-confirm-btn {
            width: 100% !important;
            padding: 14px 20px !important;
            font-size: 16px !important;
            border-radius: 10px !important;
          }
          
          /* Upload Progress Modal on Mobile */
          .upload-progress-modal {
            border-radius: 12px 12px 0 0 !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            max-width: 100% !important;
            max-height: 70vh !important;
            margin: 0 !important;
          }
          
          /* Hide UploadTray on mobile, use modal instead */
          .upload-tray {
            display: none !important;
          }
        }
        
        /* Tablet adjustments */
        @media (min-width: 769px) and (max-width: 1024px) {
          .dashboard-header {
            padding: 20px 24px !important;
            width: calc(100% - 80px) !important;
            margin-right: 80px !important;
          }
          
          .main-content {
            width: calc(100% - 40px) !important;
            margin-right: 80px !important;
          }
          
          .search-bar {
            min-width: 320px !important;
          }
          
          .files-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
          }
        }

        /* Date Input Styling - Force Light Theme */
        input[type="date"] {
          color-scheme: light !important;
          background: #FFFFFF !important;
          color: #374151 !important;
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: none !important;
          color: #374151 !important;
          cursor: pointer !important;
          filter: none !important;
        }
        
        input[type="date"]::-webkit-datetime-edit {
          color: #374151 !important;
        }
        
        input[type="date"]::-webkit-datetime-edit-text {
          color: #6B7280 !important;
        }
        
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: #374151 !important;
        }
        
        /* Override system dark mode for date inputs */
        @media (prefers-color-scheme: dark) {
          input[type="date"] {
            color-scheme: light !important;
            background: #FFFFFF !important;
            color: #374151 !important;
          }
          
          input[type="date"]::-webkit-calendar-picker-indicator {
            filter: none !important;
            color: #374151 !important;
          }
          
          input[type="date"]::-webkit-datetime-edit,
          input[type="date"]::-webkit-datetime-edit-month-field,
          input[type="date"]::-webkit-datetime-edit-day-field,
          input[type="date"]::-webkit-datetime-edit-year-field {
            color: #374151 !important;
          }
          
          input[type="date"]::-webkit-datetime-edit-text {
            color: #6B7280 !important;
          }
        }
      `}</style>

      {openUpload && (
        <div 
          className="upload-modal-overlay"
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
            className="upload-modal-content"
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
                    background: '#FFFFFF',
                    colorScheme: 'light',
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
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setFile(files[0]); // Keep first file for display
                        setMultipleFiles(files); // Store all files
                      } else {
                        setFile(null);
                        setMultipleFiles([]);
                      }
                    }}
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
                      {multipleFiles.length > 1 
                        ? `${multipleFiles.length} files selected` 
                        : file ? file.name : 'No file chosen'
                      }
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
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none',
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
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!date || (!file && multipleFiles.length === 0)}
                  onClick={async () => {
                    if (!date || (!file && multipleFiles.length === 0)) return;
                    setOpenUpload(false);
                    
                    // Get files to upload (either single file or multiple files)
                    const filesToUpload = multipleFiles.length > 0 ? multipleFiles : [file];
                    
                    // Create upload items for each file
                    const uploadItems = filesToUpload.map(file => ({
                      id: `${Date.now()}-${Math.random()}-${file.name}`,
                      name: file.name,
                      pct: 0,
                      status: 'checking',
                      date: date,
                      file: file
                    }));
                    
                    // Add all items to tray
                    setTrayItems(prev => [...prev, ...uploadItems]);
                    
                    // Process each upload independently
                    uploadItems.forEach(item => processUpload(item));
                    
                    // Reset form
                    setFile(null);
                    setMultipleFiles([]);
                    setDate('');
                    setDateISO('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: (!date || (!file && multipleFiles.length === 0)) ? '#E5E7EB' : '#3B82F6',
                    color: (!date || (!file && multipleFiles.length === 0)) ? '#9CA3AF' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!date || (!file && multipleFiles.length === 0)) ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {openUploadProgress && (
        <div 
          className="modal-backdrop"
          onClick={() => setOpenUploadProgress(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div 
            className="upload-progress-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              animation: 'slideUpFromBottom 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                Upload Progress
              </h2>
              <button
                onClick={() => setOpenUploadProgress(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trayItems.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: item.status === 'done' ? '#10B981' : item.status === 'error' ? '#EF4444' : '#3B82F6',
                      marginLeft: '8px',
                    }}>
                      {item.status === 'done' ? '✓' : item.status === 'error' ? '✗' : `${item.pct}%`}
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    background: '#E5E7EB',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${item.pct}%`,
                      background: item.status === 'done' ? '#10B981' : item.status === 'error' ? '#EF4444' : '#3B82F6',
                      transition: 'width 0.3s ease',
                    }}></div>
                  </div>
                  {item.status === 'error' && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#EF4444' }}>
                      Upload failed
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <UploadTray
        items={trayItems}
        onClose={() => setTrayItems([])}
        onAllDone={(names) => {
          setToast({ visible: true, message: names.length === 1 ? `"${truncateFileName(names[0])}" uploaded successfully` : `${names.length} files uploaded successfully`, type: 'success' });
          setTimeout(() => setTrayItems([]), 1500);
          setTimeout(() => setToast({ visible: false, message: '' }), 2000);
          // Close upload progress modal if it's open
          if (openUploadProgress) {
            setTimeout(() => setOpenUploadProgress(false), 1500);
          }
        }}
      />
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
      <LoadingOverlay open={loading} label={loadingLabel} />
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div 
          className="delete-modal-overlay"
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
            className="delete-modal-content"
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
            }}>{deleteConfirm.folderDate ? 'Delete Folder' : 'Delete File'}</h3>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.5',
            }}>
              {deleteConfirm.folderDate
                ? (<span>This folder <strong style={{ color: '#374151' }}>&quot;{deleteConfirm.folderName || deleteConfirm.folderDate}&quot;</strong> and all its files will be deleted. This action cannot be undone.</span>)
                : (<span>This file <strong style={{ color: '#374151' }}>&quot;{deleteConfirm.fileName}&quot;</strong> will be deleted. This action cannot be undone.</span>)}
            </p>
            
            <div className="delete-modal-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="delete-cancel-btn"
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
                className="delete-confirm-btn"
                onClick={async () => {
                  setDeleteConfirm(null);
                  if (deleteConfirm.folderDate) {
                    // Folder delete
                    setLoadingLabel('Deleting folder...');
                    setLoading(true);
                    try {
                      await deleteFolderByDate(deleteConfirm.folderDate);
                      invalidate();
                      const all = await fetchDrive({ fresh: true });
                      setGroups(all);
                      setToast({ visible: true, message: `"${truncateFileName(group.date)}" folder deleted successfully`, type: 'success' });
                      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
                    } catch (e) {
                      console.error('Delete folder error:', e);
                      if (e.message?.includes('401') || e.message?.includes('Unauthorized') || e.message?.includes('Authentication failed')) {
                        setSessionExpired(true);
                      } else {
                        setToast({ visible: true, message: `Failed to delete "${truncateFileName(group.date)}" folder`, type: 'error' });
                        setTimeout(() => setToast({ visible: false, message: '' }), 2000);
                      }
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    // File delete
                    const { fileId } = deleteConfirm;
                    setLoadingLabel('Deleting file...');
                    setLoading(true);
                    try {
                      await deleteFile(fileId);
                      invalidate();
                      const all = await fetchDrive({ fresh: true });
                      setGroups(all);
                      setToast({ visible: true, message: `"${truncateFileName(deleteConfirm.fileName)}" deleted successfully`, type: 'success' });
                      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
                    } catch (e) {
                      console.error('Delete error:', e);
                      if (e.message?.includes('401') || e.message?.includes('Unauthorized') || e.message?.includes('Authentication failed')) {
                        setSessionExpired(true);
                      } else {
                        setToast({ visible: true, message: `Failed to delete "${truncateFileName(deleteConfirm.fileName)}"`, type: 'error' });
                        setTimeout(() => setToast({ visible: false, message: '' }), 2000);
                      }
                    } finally {
                      setLoading(false);
                    }
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


