export default function FileRow({ file, onOpen, onDelete }) {
  return (
    <div style={{ width: 160, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ height: 90, background: '#f3f4f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        PDF
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onOpen(file)}>Open</button>
        <button style={{ color: '#ef4444' }} onClick={() => onDelete(file)}>Delete</button>
      </div>
    </div>
  );
}

