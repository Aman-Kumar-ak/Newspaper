import FileRow from './FileRow.jsx';

export default function FolderList({ groups, onOpen, onDelete, filter, search }) {
  const match = (name) => {
    if (!search) return true;
    return name.toLowerCase().includes(search.toLowerCase());
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(group => (
        <div key={group.date}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{group.date}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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

