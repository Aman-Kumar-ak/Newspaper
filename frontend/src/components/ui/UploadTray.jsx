import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadWithProgress } from '../../lib/drive';

// A versatile upload tray that sits bottom-right, supports queuing multiple files,
// shows per-file progress, and allows adding more files while uploading.
// Props:
// - open: boolean
// - onClose: () => void
// - onItemDone: (dateStr) => void  // called when an item finishes so caller can refresh that date group
// When `items` is provided, the tray becomes view-only (no Add/Date/Cancel UI) and simply renders progress.
export default function UploadTray({ open, onClose, onItemDone, items: externalItems, onAllDone }) {
  const [date, setDate] = useState('');
  const [items, setItems] = useState([]); // {id, file, name, pct, status: queued|uploading|processing|done|error, xhr}
  const processingRef = useRef(false);
  const inputRef = useRef(null);

  // Start processing queue sequentially (only in internal/interactive mode)
  useEffect(() => {
    if (externalItems) return; // view-only mode
    if (!open) return;
    if (processingRef.current) return;
    const next = items.find(i => i.status === 'queued');
    if (!next) return;
    processingRef.current = true;
    const start = async () => {
      setItems(prev => prev.map(i => i.id === next.id ? { ...i, status: 'uploading', pct: 0 } : i));
      try {
        const { promise, xhr } = uploadWithProgress(date, next.file, (pct) => {
          setItems(prev => prev.map(i => i.id === next.id ? { ...i, pct, status: pct >= 100 ? 'processing' : 'uploading' } : i));
        });
        setItems(prev => prev.map(i => i.id === next.id ? { ...i, xhr } : i));
        await promise;
        // mark done
        setItems(prev => prev.map(i => i.id === next.id ? { ...i, status: 'done', pct: 100, xhr: undefined } : i));
        if (onItemDone && date) onItemDone(date);
      } catch (e) {
        setItems(prev => prev.map(i => i.id === next.id ? { ...i, status: 'error' } : i));
      } finally {
        processingRef.current = false;
        // trigger next item
        setTimeout(() => {
          // Force effect rerun
          setItems(prev => [...prev]);
        }, 0);
      }
    };
    start();
  }, [items, open, date, onItemDone]);

  // When external items provided, detect completion and summon toast via onAllDone
  useEffect(() => {
    if (!externalItems) return;
    const allDone = externalItems.length > 0 && externalItems.every(i => i.status === 'done');
    if (allDone && onAllDone) onAllDone(externalItems.map(i => i.name));
  }, [externalItems, onAllDone]);

  const list = externalItems || items;
  const hasActive = useMemo(() => list.some(i => i.status === 'queued' || i.status === 'uploading' || i.status === 'processing'), [list]);

  // Auto-hide when all items are done and not opened via open flag
  if (!open && !hasActive) return null;

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, width: 360, maxWidth: '95vw', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 6px 22px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 700 }}>Uploading {list.filter(i => i.status !== 'done').length} item{list.filter(i => i.status !== 'done').length === 1 ? '' : 's'}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!externalItems && <button onClick={() => inputRef.current?.click()}>Add</button>}
          <button onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!externalItems && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Date</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <input ref={inputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          const newItems = files.map(f => ({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, file: f, name: f.name, pct: 0, status: 'queued' }));
          setItems(prev => [...prev, ...newItems]);
          // reset input to allow uploading same file name again later
          e.target.value = '';
        }} />
          </>
        )}
        <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
          {list.map(item => (
            <div key={item.id} style={{ padding: 8, borderRadius: 8, border: '1px solid #eef2f7', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {item.status === 'uploading' && <span style={{ fontSize: 12, color: '#6b7280' }}>{item.pct}%</span>}
                  {item.status === 'processing' && <span style={{ fontSize: 12, color: '#6b7280' }}>Processing…</span>}
                  {item.status === 'error' && <span style={{ fontSize: 12, color: '#ef4444' }}>Error</span>}
                  {!externalItems && (item.status === 'uploading' || item.status === 'queued') && <button onClick={() => { try { item.xhr?.abort(); } catch {} setItems(prev => prev.filter(i => i.id !== item.id)); }}>Cancel</button>}
                </div>
              </div>
              <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: `${item.pct}%`, height: '100%', background: item.status === 'error' ? '#ef4444' : '#3b82f6' }} />
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div style={{ color: '#6b7280', fontSize: 12 }}>Use Add to select PDFs. They will upload in order.</div>
          )}
        </div>
      </div>
    </div>
  );
}

