// PDF Annotation Storage and Sync Service
const ANNOTATION_STORAGE_KEY = 'pdf-annotations';
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Get annotations from localStorage
export function getStoredAnnotations(fileId) {
  try {
    const stored = localStorage.getItem(ANNOTATION_STORAGE_KEY);
    const annotations = stored ? JSON.parse(stored) : {};
    return annotations[fileId] || null;
  } catch (e) {
    console.warn('Error reading annotations:', e);
    return null;
  }
}

// Store annotations in localStorage
export function storeAnnotations(fileId, annotationData) {
  try {
    const stored = localStorage.getItem(ANNOTATION_STORAGE_KEY);
    const annotations = stored ? JSON.parse(stored) : {};
    annotations[fileId] = {
      data: annotationData,
      timestamp: Date.now(),
      synced: false
    };
    localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
    
    // Try to sync to server
    syncAnnotationsToServer(fileId, annotationData);
  } catch (e) {
    console.warn('Error storing annotations:', e);
  }
}

// Sync annotations to server
export async function syncAnnotationsToServer(fileId, annotationData) {
  try {
    const { getTokens } = await import('../state/authStore');
    const { accessToken, refreshToken } = getTokens();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) headers['x-google-access-token'] = accessToken;
    if (refreshToken) headers['x-google-refresh-token'] = refreshToken;

    const response = await fetch(`${API_BASE}/drive/annotations/${fileId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ annotations: annotationData })
    });

    if (response.ok) {
      // Mark as synced
      const stored = localStorage.getItem(ANNOTATION_STORAGE_KEY);
      const annotations = stored ? JSON.parse(stored) : {};
      if (annotations[fileId]) {
        annotations[fileId].synced = true;
        localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
      }
    }
  } catch (e) {
    console.warn('Failed to sync annotations to server:', e);
  }
}

// Load annotations from server
export async function loadAnnotationsFromServer(fileId) {
  try {
    const { getTokens } = await import('../state/authStore');
    const { accessToken, refreshToken } = getTokens();
    
    const headers = {};
    if (accessToken) headers['x-google-access-token'] = accessToken;
    if (refreshToken) headers['x-google-refresh-token'] = refreshToken;

    const response = await fetch(`${API_BASE}/drive/annotations/${fileId}`, {
      headers
    });

    if (response.ok) {
      const data = await response.json();
      
      // Store locally and mark as synced
      if (data.annotations) {
        const stored = localStorage.getItem(ANNOTATION_STORAGE_KEY);
        const annotations = stored ? JSON.parse(stored) : {};
        annotations[fileId] = {
          data: data.annotations,
          timestamp: Date.now(),
          synced: true
        };
        localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
        return data.annotations;
      }
    }
  } catch (e) {
    console.warn('Failed to load annotations from server:', e);
  }
  
  return null;
}

// Sync all pending annotations
export async function syncAllPendingAnnotations() {
  try {
    const stored = localStorage.getItem(ANNOTATION_STORAGE_KEY);
    const annotations = stored ? JSON.parse(stored) : {};
    
    for (const [fileId, annotation] of Object.entries(annotations)) {
      if (!annotation.synced) {
        await syncAnnotationsToServer(fileId, annotation.data);
      }
    }
  } catch (e) {
    console.warn('Error syncing pending annotations:', e);
  }
}

// Clear old annotations (older than 30 days)
export function cleanupOldAnnotations() {
  try {
    const stored = localStorage.getItem(ANNOTATION_STORAGE_KEY);
    const annotations = stored ? JSON.parse(stored) : {};
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let hasChanges = false;
    for (const [fileId, annotation] of Object.entries(annotations)) {
      if (annotation.timestamp < thirtyDaysAgo) {
        delete annotations[fileId];
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
    }
  } catch (e) {
    console.warn('Error cleaning up annotations:', e);
  }
}