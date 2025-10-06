import { useEffect, useMemo, useRef, useState } from 'react';
import { getFileBytes, updateFileBytes } from '../../lib/drive';
import Toast from '../../components/ui/Toast';

// Adobe PDF Embed API key from environment variables
const ADOBE_API_KEY = import.meta.env.VITE_ADOBE_CLIENT_ID;

export default function PdfViewer() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  const adobeViewerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  
  useEffect(() => {
    const h = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  // Auto-clear toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Expected route: #/viewer/:fileId
  const fileId = useMemo(() => {
    const p = (hash.replace('#', '') || '/').split('/');
    if (p[1] === 'viewer' && p[2]) return p[2];
    return '';
  }, [hash]);

  // Load Adobe PDF Embed API
  useEffect(() => {
    // Check if Adobe API key is configured
    if (!ADOBE_API_KEY) {
      setError('Adobe PDF Embed API key not configured. Please add VITE_ADOBE_CLIENT_ID to your .env file.');
      return;
    }

    const waitForAdobeAPI = () => {
      if (window.AdobeDC) {
        console.log('Adobe PDF Embed API loaded successfully');
        return Promise.resolve();
      }
      
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkAPI = () => {
          if (window.AdobeDC) {
            console.log('Adobe PDF Embed API loaded successfully');
            resolve();
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkAPI, 100);
          } else {
            reject(new Error('Adobe PDF Embed API failed to load within timeout'));
          }
        };
        
        checkAPI();
      });
    };

    waitForAdobeAPI().catch(err => {
      console.error('Failed to load Adobe PDF Embed API:', err);
      setError('Failed to load Adobe PDF viewer. Please refresh the page.');
    });
  }, []);

  // Load and display PDF with Adobe Embed API
  useEffect(() => {
    if (!fileId) return;

    const loadFile = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Loading file for fileId:', fileId);
        const response = await getFileBytes(fileId);
        const { bytes, fileName: responseFileName } = response;
        
        if (!bytes || bytes.byteLength === 0) {
          throw new Error('File is empty or not found');
        }
        
        // Detect file type from filename extension and content
        const finalFileName = responseFileName || `file_${fileId}`;
        setFileName(finalFileName);
        
        // Only handle PDF files
        const extension = finalFileName.split('.').pop()?.toLowerCase();
        if (extension !== 'pdf') {
          setError('This viewer only supports PDF files.');
          setLoading(false);
          return;
        }
        
        // bytes is already an ArrayBuffer from getFileBytes
        const arrayBuffer = bytes;
        const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
        
        console.log(`PDF file size: ${fileSizeMB.toFixed(2)} MB`);
        
        // Warn for large files
        if (fileSizeMB > 10) {
          console.warn('Large PDF file detected, may take longer to load');
          setToast({
            message: `Large PDF file (${fileSizeMB.toFixed(1)} MB) - please wait while loading...`,
            type: 'success',
          });
        }
        
        // Convert to Uint8Array for potential saving operations
        const uint8Array = new Uint8Array(arrayBuffer);
        setFileBytes(uint8Array);
        
        // Wait for Adobe API to be available
        if (!window.AdobeDC) {
          throw new Error('Adobe PDF Embed API not loaded');
        }
        
        // Initialize Adobe PDF viewer with proper ArrayBuffer and filename
        initializeAdobeViewer(arrayBuffer, finalFileName);
        
        // Set a timeout to prevent infinite loading for large files
        setTimeout(() => {
          if (loading) {
            console.warn('PDF loading timeout - file may be too large');
            setLoading(false);
            setError('PDF is taking too long to load. This might be due to large file size. Please try again or use a smaller file.');
          }
        }, 30000); // 30 second timeout
        
      } catch (err) {
        console.error('Error loading file:', err);
        setError('Failed to load file: ' + err.message);
        setLoading(false);
      }
    };

    loadFile();
  }, [fileId]);

  const initializeAdobeViewer = (arrayBuffer, fileName) => {
    if (!adobeViewerRef.current) {
      console.error('Adobe viewer container not found');
      return;
    }
    
    if (!window.AdobeDC) {
      console.error('Adobe PDF Embed API not loaded');
      setError('Adobe PDF viewer not available. Please refresh the page.');
      return;
    }
    
    console.log('Initializing Adobe viewer with file:', fileName);
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    console.log('Adobe API Client ID:', ADOBE_API_KEY);
    
    let adobeDCView;
    
    try {
      // Clear previous viewer
      adobeViewerRef.current.innerHTML = '';
      
      // Ensure the container has proper dimensions
      adobeViewerRef.current.style.width = '100%';
      adobeViewerRef.current.style.height = '100%';
      adobeViewerRef.current.style.display = 'block';
      adobeViewerRef.current.style.position = 'relative';
      
      // Create Adobe DC View instance
      adobeDCView = new window.AdobeDC.View({
        clientId: ADOBE_API_KEY,
        divId: 'adobe-pdf-viewer'
      });
    
      console.log('Adobe DC View instance created successfully');
    } catch (error) {
      console.error('Error creating Adobe DC View:', error);
      setError('Failed to initialize Adobe PDF viewer. Please check your API key.');
      return;
    }

    // Configure viewer options with maximum annotation support
    const viewerConfig = {
      enableFormFilling: true,
      enableRedaction: true, // Enable redaction tools
      enablePDFAnalytics: false,
      enableLeftHandPanel: true, // Show left panel for tools
      enableRightHandPanel: false, // Show right panel for annotations
      enableSearchAPIs: true,
      enableLinearization: false,
      enableAnnotationAPIs: true, // Enable annotations
      includePDFAnnotations: true, // Include existing annotations
      showDownloadPDF: true, // Show download option
      showPrintPDF: true, // Show print option
      showAnnotationTools: true, // Show annotation toolbar
      showSharePDF: false,
      embedMode: "FULL_WINDOW", // Use full window for all tools
      defaultViewMode: "FIT_WIDTH", // Fit width for better annotation experience
      showBookmarks: false, // Show bookmarks panel
      showThumbnails: true, // Show thumbnails panel
      exitPDFViewerType: "RETURN", // Return to same page when exiting
      showFullScreen: true, // Enable fullscreen option
      showZoomControl: false, // Show zoom controls
      enableFormFillAPI: false, // Enable form filling API
      enableCommentAPI: true, // Enable comment API
      showCommentTools: true, // Show comment tools
    };
    
    // Load PDF from ArrayBuffer with error handling
    try {
      console.log('Loading PDF in Adobe viewer:', { fileName, fileId, arrayBufferSize: arrayBuffer.byteLength });
      
      // Create a promise with timeout for large files
      const loadingPromise = adobeDCView.previewFile({
        content: { promise: Promise.resolve(arrayBuffer) },
        metaData: {
          fileName: fileName,
          id: fileId
        }
      }, viewerConfig);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout')), 25000); // 25 second timeout
      });
      
      Promise.race([loadingPromise, timeoutPromise])
        .then(() => {
          console.log('Adobe PDF viewer loaded successfully');
          setLoading(false); // Stop loading when PDF is ready
          
        }).catch((error) => {
          console.error('Adobe PDF preview promise error:', error);
          setLoading(false);
            if (error.message === 'PDF loading timeout') {
              setError('PDF is too large and timed out. Please try a smaller file or refresh the page.');
            } else {
              setError(`Failed to display PDF: ${error.message || 'Unknown error'}`);
            }
        });
      
    } catch (error) {
      console.error('Adobe PDF preview error:', error);
      setError('Failed to display PDF. The file may be corrupted or in an unsupported format.');
      return;
    }
    
    // Register callbacks for auto-save functionality
    try {
      // Save callback - when user explicitly saves
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.SAVE_API,
        function(metaData, content, options) {
          console.log('Save callback triggered');
          saveToGoogleDrive(content);
        },
        {}
      );

      // Annotation callback - auto-save when annotations are added/modified
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.GET_USER_PROFILE_API,
        function() {
          return {
            code: window.AdobeDC.View.Enum.ApiResponseCode.SUCCESS,
            data: {
              userProfile: {
                name: "User",
                firstName: "User",
                lastName: "",
                email: "user@example.com"
              }
            }
          };
        },
        {}
      );

      // Document events callback - for auto-save on changes
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
        function(event) {
          console.log('PDF Event:', event);
          
          // Auto-save on annotation events
          if (event.type === 'ANNOTATION_ADDED' || 
              event.type === 'ANNOTATION_UPDATED' || 
              event.type === 'ANNOTATION_DELETED') {
            console.log('Annotation changed, auto-saving...');
            
            // Get PDF with annotations and save
            adobeDCView.getAPIs().then(function(apis) {
              apis.getPDFExportAPIs().getBuffer().then(function(buffer) {
                console.log('Auto-saving PDF with annotations');
                saveToGoogleDrive(new Uint8Array(buffer), true); // true for auto-save
              }).catch(function(error) {
                console.error('Error getting PDF buffer for auto-save:', error);
              });
            }).catch(function(error) {
              console.error('Error getting APIs for auto-save:', error);
            });
          }
        },
        {
          enablePDFAnalytics: false,
          listenOn: [
            window.AdobeDC.View.Enum.PDFAnalyticsEvents.ANNOTATION_ADDED,
            window.AdobeDC.View.Enum.PDFAnalyticsEvents.ANNOTATION_UPDATED,
            window.AdobeDC.View.Enum.PDFAnalyticsEvents.ANNOTATION_DELETED
          ]
        }
      );

    } catch (error) {
      console.error('Error registering callbacks:', error);
    }
  };
  
    const saveToGoogleDrive = async (savedPdf, isAutoSave = false) => {
      try {
        setIsSaving(true);
        
        // Get the PDF bytes
        const uint8Array = new Uint8Array(savedPdf);
        const blob = new Blob([uint8Array], { type: 'application/pdf' });
        
        // Update the file in Google Drive with the same filename
        await updateFileBytes(fileId, blob);
        
        const message = isAutoSave 
          ? `Annotations auto-saved to "${fileName}"` 
          : `PDF saved to Google Drive as "${fileName}"`;
          
        setToast({
          message: message,
          type: 'success',
        });
        
        console.log(`Successfully ${isAutoSave ? 'auto-' : ''}saved PDF to Google Drive`);
      } catch (error) {
        console.error('Error saving to Google Drive:', error);
        setToast({
          message: `Failed to ${isAutoSave ? 'auto-' : ''}save changes to Google Drive`,
          type: 'error',
        });
      } finally {
        setIsSaving(false);
      }
    };  if (!fileId) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 16
      }}>
        <h2>No PDF Selected</h2>
        <button onClick={() => window.location.hash = '#/'}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 16
      }}>
        <h2 style={{ color: '#ef4444' }}>Error</h2>
        <p>{error}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.location.reload()}>Try Again</button>
          <button onClick={() => window.location.hash = '#/'}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      background: '#f8f9fa'
    }}>
      {/* Minimal Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        background: 'rgba(249, 250, 251, 0.98)',
        borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
        position: 'relative',
        zIndex: 1000,
        height: '40px',
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <button
          onClick={() => window.location.hash = '#/'}
          style={{
            padding: '4px 8px',
            background: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ← Back
        </button>
        <div style={{ 
          margin: '0 8px', 
          flex: 1, 
          fontSize: '14px',
          fontWeight: '500',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center'
        }}>
          {fileName} {loading && '(Loading...)'}
        </div>
        {isSaving && (
          <div style={{ 
            fontSize: '12px', 
            color: '#059669',
            marginRight: '8px'
          }}>
            Saving...
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#6b7280' }}>
          Adobe PDF Viewer
        </div>
      </div>

      {/* Adobe PDF Viewer Container */}
      <div 
        id="adobe-pdf-viewer"
        ref={adobeViewerRef}
        style={{ 
          flex: 1,
          width: '100%',
          height: 'calc(100vh - 40px)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      />
      
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '30px 50px',
            borderRadius: 12,
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{ marginBottom: '15px' }}>
              🔄 Loading PDF with Adobe Viewer...
            </div>
            <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '10px' }}>
              {fileName}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Large files may take up to 30 seconds to load
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              marginTop: '15px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #4f46e5)',
                animation: 'loading-pulse 2s ease-in-out infinite'
              }} />
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes loading-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}


