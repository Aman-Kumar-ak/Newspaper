import FileRow from './FileRow.jsx';

export default function FolderList({ groups, onOpen, onDelete, filter, search }) {
  const match = (name) => {
    if (!search) return true;
    return name.toLowerCase().includes(search.toLowerCase());
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {groups.map(group => (
        <div key={group.date}>
          {/* News ticker style date separator */}
          <div style={{
            fontWeight: 900,
            fontSize: '1.3rem',
            background: 'linear-gradient(90deg, #d90429 0%, #fff 100%)',
            color: 'white',
            padding: '8px 24px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            letterSpacing: '2px',
            marginBottom: 18,
            fontFamily: 'Merriweather, Georgia, serif',
            textShadow: '0 1px 2px #d90429',
            borderLeft: '6px solid #d90429',
            borderRight: '2px solid #d90429',
            width: 'fit-content',
          }}>{group.date}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {group.files.filter(f => match(f.fileName)).map(f => (
              <FileRow key={f.fileId} file={f} onOpen={onOpen} onDelete={onDelete} />)
            )}
            {group.files.length === 0 && <div style={{ color: '#6b7280' }}>No files</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

