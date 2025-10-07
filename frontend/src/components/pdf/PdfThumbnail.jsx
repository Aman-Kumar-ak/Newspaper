import { useState, useEffect, useRef } from 'react';
import { getTokens } from '../../state/authStore';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// In-memory cache for thumbnails
const thumbnailCache = new Map();

function authHeaders() {
  const { accessToken, refreshToken } = getTokens();
  const h = {};
  if (accessToken) h['x-google-access-token'] = accessToken;
  if (refreshToken) h['x-google-refresh-token'] = refreshToken;
  return h;
}

export default function PdfThumbnail({ fileId, fileName }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canvasRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    abortControllerRef.current = new AbortController();

    async function generateThumbnail() {
      try {
        // Check cache first
        if (thumbnailCache.has(fileId)) {
          setThumbnail(thumbnailCache.get(fileId));
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(false);

        // Fetch PDF from backend with abort signal
        const response = await fetch(`${API_BASE}/drive/file/${fileId}`, {
          headers: authHeaders(),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch PDF');
        }

        const arrayBuffer = await response.arrayBuffer();
        
        if (!mounted) return;

        // Load PDF document with lower quality settings for speed
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
        });
        const pdf = await loadingTask.promise;
        
        // Get first page
        const page = await pdf.getPage(1);
        
        // Use lower scale for faster rendering (0.5 instead of calculating)
        const viewport = page.getViewport({ scale: 0.5 });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render PDF page to canvas with lower quality for speed
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          intent: 'display',
        };
        await page.render(renderContext).promise;
        
        if (!mounted) return;
        
        // Convert canvas to data URL with lower quality for speed
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // Cache the thumbnail
        thumbnailCache.set(fileId, dataUrl);
        
        setThumbnail(dataUrl);
        setLoading(false);
        
        // Clean up
        await pdf.destroy();
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Thumbnail generation aborted for:', fileName);
          return;
        }
        console.error('Failed to generate PDF thumbnail:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    generateThumbnail();

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fileId, fileName]);

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        borderRadius: '6px',
        padding: '16px',
        border: '1px solid #E5E7EB',
        minHeight: '140px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated shimmer effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid #E5E7EB',
          borderTopColor: '#3B82F6',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes shimmer {
              to { left: 100%; }
            }
          `}
        </style>
      </div>
    );
  }

  if (error || !thumbnail) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '6px',
        padding: '16px',
        border: '1px solid #E5E7EB',
        minHeight: '140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '12px',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: '#EF4444' }}>
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}>
          PDF
        </div>
        <div style={{
          fontSize: '11px',
          color: '#6B7280',
          fontWeight: 500,
        }}>
          Preview unavailable
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '6px',
      padding: '4px',
      border: '1px solid #E5E7EB',
      minHeight: '140px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <img
        ref={canvasRef}
        src={thumbnail}
        alt={fileName || 'PDF Preview'}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '180px',
          objectFit: 'contain',
          borderRadius: '4px',
        }}
      />
    </div>
  );
}
