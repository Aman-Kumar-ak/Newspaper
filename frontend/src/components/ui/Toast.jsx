export default function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#111827', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 22px rgba(0,0,0,0.25)', zIndex: 70 }}>
      {message}
    </div>
  );
}

