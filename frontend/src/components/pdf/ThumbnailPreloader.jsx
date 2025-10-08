import { useEffect } from 'react';
import PdfThumbnail from './PdfThumbnail';

// Invisible component that preloads thumbnails for all files
export default function ThumbnailPreloader({ groups }) {
  if (!groups || !Array.isArray(groups)) return null;

  // Get all files from all groups
  const allFiles = groups.flatMap(group => group.files || []);

  return (
    <div style={{ 
      position: 'absolute', 
      top: '-9999px', 
      left: '-9999px', 
      visibility: 'hidden',
      pointerEvents: 'none',
      opacity: 0,
      width: '1px',
      height: '1px',
      overflow: 'hidden'
    }}>
      {allFiles.map((file) => (
        <div key={file.fileId} style={{ width: '1px', height: '1px' }}>
          <PdfThumbnail 
            fileId={file.fileId} 
            fileName={file.fileName || file.name} 
          />
        </div>
      ))}
    </div>
  );
}