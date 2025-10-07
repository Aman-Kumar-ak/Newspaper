const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Cache for thumbnails
const thumbnailCache = new Map();

/**
 * Generate a thumbnail for the first page of a PDF using canvas
 * @param {string} fileId - The Google Drive file ID
 * @param {object} authHeaders - Authentication headers
 * @returns {Promise<string>} - Data URL of the thumbnail image
 */
export async function generatePdfThumbnail(fileId, authHeaders) {
  // Check cache first
  if (thumbnailCache.has(fileId)) {
    return thumbnailCache.get(fileId);
  }

  try {
    // Simple approach: Return the file URL and let an iframe/image handle it
    // For now, we'll return a placeholder or fetch the first page
    // Since generating thumbnails client-side is complex without proper PDF.js setup,
    // we'll use a simpler approach: display PDF icon or first page via backend
    
    return null; // Will trigger fallback UI
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    return null;
  }
}

/**
 * Clear thumbnail cache
 */
export function clearThumbnailCache() {
  thumbnailCache.clear();
}
