export default function LoadingOverlay({ open, label }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(3px)', background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.85)', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        <div style={{ color: '#374151', fontWeight: 600 }}>{label || 'Loading...'}</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}


