

import { useState, useRef, useEffect } from 'react';
import { cacheGetPdf } from '../../lib/idb';
import useOutsideClick from '../../hooks/useOutsideClick';
import { offlineManager, getErrorMessage } from '../../lib/offlineUtils';

export default function FileRow({ file, onOpen, onDelete }) {
  // Ensure file has required properties
  const fileId = file.fileId || file.id;
  const fileName = file.fileName || file.name || 'document.pdf';
  const [menuOpen, setMenuOpen] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState(false);
  const menuRef = useRef();

  useOutsideClick(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    let mounted = true;
    cacheGetPdf(fileId).then(res => {
      if (mounted) setOfflineAvailable(!!res);
    }).catch(error => {
      console.error('Error checking offline status:', error);
      if (mounted) setOfflineAvailable(false);
    });
    return () => { mounted = false; };
  }, [fileId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleMakeOffline = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) {
      console.log('Operation already in progress, ignoring click');
      return;
    }
    
    setMenuOpen(false);
    setIsProcessing(true);
    
    try {
      console.log('🔄 Starting offline operation for file:', fileId, fileName);
      const result = await offlineManager.makeFileOffline({ id: fileId, fileName });
      
      if (result.success) {
        setOfflineAvailable(true);
        if (!result.alreadyOffline) {
          console.log('✅ File saved for offline use:', fileName);
        } else {
          console.log('ℹ️ File was already available offline:', fileName);
        }
      } else {
        const errorMsg = getErrorMessage(result, 'Saving file offline');
        console.error('❌ Failed to make file offline:', errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleMakeOffline:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveOffline = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) {
      console.log('Operation already in progress, ignoring click');
      return;
    }
    
    setMenuOpen(false);
    setIsProcessing(true);
    
    try {
      console.log('🔄 Removing file from offline storage:', fileId, fileName);
      const result = await offlineManager.removeFileFromOffline(fileId);
      
      if (result.success) {
        setOfflineAvailable(false);
        console.log('✅ File removed from offline storage:', fileName);
      } else {
        const errorMsg = getErrorMessage(result, 'Removing file from offline storage');
        console.error('❌ Failed to remove offline file:', errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleRemoveOffline:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    console.log('Deleting file:', fileId);
    onDelete(file);
  };

  return (
    <div style={{
      width: 200,
      padding: 14,
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      background: 'white',
      boxShadow: '0 2px 12px rgba(217,4,41,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'box-shadow 0.2s',
      cursor: 'pointer',
      position: 'relative',
      fontFamily: 'Georgia, Times New Roman, Times, serif',
    }}>
      <div style={{
        height: 90,
        background: 'linear-gradient(135deg, #f3f4f6 60%, #d90429 100%)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d90429',
        fontWeight: 900,
        fontSize: '1.3rem',
        letterSpacing: '2px',
        boxShadow: '0 1px 4px rgba(217,4,41,0.08)',
        position: 'relative',
      }}>
        PDF
        {offlineAvailable && (
          <span title="Available offline" style={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#059669',
            fontSize: 18,
            background: '#e0f2f1',
            borderRadius: '50%',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 13l3 3 7-7"/></svg>
          </span>
        )}
        <button
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: '#6b7280',
            padding: 0,
            zIndex: 2,
          }}
          onClick={e => { 
            e.stopPropagation(); 
            console.log('Menu button clicked, current state:', menuOpen);
            setMenuOpen(v => !v); 
          }}
          aria-label="File options"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
        </button>
        {menuOpen && (
          <div ref={menuRef} style={{
            position: 'absolute',
            top: 36,
            left: 8,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 10,
            minWidth: 180,
            padding: '6px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <button
              type="button"
              style={{
                ...menuBtnStyle,
                color: (isOnline && !isProcessing) ? '#222' : '#bbb',
                cursor: (isOnline && !isProcessing) ? 'pointer' : 'not-allowed',
                opacity: (isOnline && !isProcessing) ? 1 : 0.5,
              }}
              onClick={(isOnline && !isProcessing) ? handleMakeOffline : (e) => { e.preventDefault(); e.stopPropagation(); }}
              disabled={!isOnline || isProcessing}
              aria-label="Make file available offline"
            >
              <svg width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight:8}} aria-hidden="true"><path d="M12 5v14m7-7H5"/></svg>
              Make available offline
            </button>
            <button
              type="button"
              style={{
                ...menuBtnStyle,
                color: (offlineAvailable && !isProcessing) ? '#222' : '#bbb',
                cursor: (offlineAvailable && !isProcessing) ? 'pointer' : 'not-allowed',
                opacity: (offlineAvailable && !isProcessing) ? 1 : 0.5,
              }}
              onClick={(offlineAvailable && !isProcessing) ? handleRemoveOffline : (e) => { e.preventDefault(); e.stopPropagation(); }}
              disabled={!offlineAvailable || isProcessing}
              aria-label="Remove file from offline storage"
            >
              <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight:8}} aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Remove from offline
            </button>
            <button
              type="button"
              style={{
                ...menuBtnStyle,
                color: '#ef4444',
                cursor: 'pointer',
              }}
              onClick={handleDelete}
              aria-label="Delete file"
            >
              <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight:8}} aria-hidden="true"><path d="M3 6h18M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/></svg>
              Delete
            </button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#222' }}>{fileName}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          background: '#d90429',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: '0.95rem',
          padding: '4px 12px',
          boxShadow: '0 1px 4px rgba(217,4,41,0.08)',
          cursor: 'pointer',
        }} onClick={() => onOpen(file)}>Open</button>
        <button style={{
          background: '#fff',
          color: '#d90429',
          border: '1px solid #d90429',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: '0.95rem',
          padding: '4px 12px',
          boxShadow: '0 1px 4px rgba(217,4,41,0.08)',
          cursor: 'pointer',
        }} onClick={() => onDelete(file)}>Delete</button>
      </div>
    </div>
  );
}

const menuBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  background: 'none',
  border: 'none',
  color: '#222',
  fontWeight: 500,
  fontSize: 15,
  padding: '10px 18px',
  cursor: 'pointer',
  textAlign: 'left',
  gap: 8,
};

