import { useEffect, useMemo } from 'react';

// Upload tray that shows upload progress
// Close button only appears when there's an error
export default function UploadTray({ items, onClose, onAllDone }) {
  // Detect completion and summon toast via onAllDone
  useEffect(() => {
    if (!items || items.length === 0) return;
    const allDone = items.every(i => i.status === 'done');
    if (allDone && onAllDone) onAllDone(items.map(i => i.name));
  }, [items, onAllDone]);

  const hasError = useMemo(() => items?.some(i => i.status === 'error'), [items]);
  const uploadingCount = useMemo(() => items?.filter(i => i.status !== 'done' && i.status !== 'error').length || 0, [items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="upload-tray" style={{ 
      position: 'fixed', 
      right: 24, 
      bottom: 24, 
      width: 380, 
      maxWidth: '95vw', 
      background: '#FFFFFF', 
      border: '1px solid #E5E7EB', 
      borderRadius: '16px', 
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
      overflow: 'hidden', 
      zIndex: 60 
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px 20px', 
        background: '#F9FAFB', 
        borderBottom: '1px solid #E5E7EB' 
      }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: '16px', 
          color: '#111827' 
        }}>
          {hasError ? 'Upload Failed' : uploadingCount > 0 ? `Uploading ${uploadingCount} item${uploadingCount === 1 ? '' : 's'}` : 'Upload Complete'}
        </div>
        {hasError && (
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>
      
      <div style={{ padding: '16px 20px', maxHeight: '400px', overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            Use Add to select PDFs. They will upload in order.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(item => (
              <div key={item.id} style={{ 
                padding: '12px', 
                borderRadius: '10px', 
                border: '1px solid #F3F4F6', 
                background: '#FAFAFA' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '8px' 
                }}>
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: '#111827',
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    maxWidth: '70%'
                  }}>
                    {item.name}
                  </div>
                  <div>
                    {item.status === 'checking' && (
                      <span style={{ fontSize: 13, color: '#8B5CF6', fontWeight: 500 }}>Checking...</span>
                    )}
                    {item.status === 'creating-folder' && (
                      <span style={{ fontSize: 13, color: '#8B5CF6', fontWeight: 500 }}>Creating folder... {item.pct}%</span>
                    )}
                    {item.status === 'uploading' && (
                      <span style={{ fontSize: 13, color: '#3B82F6', fontWeight: 500 }}>{item.pct}%</span>
                    )}
                    {item.status === 'processing' && (
                      <span style={{ fontSize: 13, color: '#3B82F6', fontWeight: 500 }}>Processing...</span>
                    )}
                    {item.status === 'done' && (
                      <span style={{ fontSize: 13, color: '#10B981', fontWeight: 500 }}>✓ Done</span>
                    )}
                    {item.status === 'error' && (
                      <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>✗ Error</span>
                    )}
                  </div>
                </div>
                
                <div style={{ 
                  width: '100%', 
                  height: 6, 
                  background: '#E5E7EB', 
                  borderRadius: 3, 
                  overflow: 'hidden' 
                }}>
                  <div style={{ 
                    width: `${item.pct || 0}%`, 
                    height: '100%', 
                    background: item.status === 'error' ? '#EF4444' : 
                               item.status === 'done' ? '#10B981' : 
                               item.status === 'creating-folder' ? '#8B5CF6' : '#3B82F6',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        /* Mobile Styles for Upload Tray */
        @media (max-width: 768px) {
          .upload-tray {
            right: 12px !important;
            bottom: 12px !important;
            width: calc(100vw - 24px) !important;
            max-width: calc(100vw - 24px) !important;
          }
        }
      `}</style>
    </div>
  );
}

