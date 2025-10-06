export default function FileRow({ file, onOpen, onDelete }) {
  return (
    <div style={{
      width: 180,
      padding: 12,
      border: '1px solid #e5e7eb',
      borderRadius: 12,
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
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d90429',
        fontWeight: 900,
        fontSize: '1.3rem',
        letterSpacing: '2px',
        boxShadow: '0 1px 4px rgba(217,4,41,0.08)',
      }}>
        PDF
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#222' }}>{file.fileName}</div>
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

