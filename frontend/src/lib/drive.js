// Delete a folder (date group) by date string
export async function deleteFolderByDate(date) {
  const url = new URL(`${API_BASE}/drive/folder/${encodeURIComponent(date)}`);
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  return handleApiResponse(res);
}
import { getTokens } from '../state/authStore';
import { cacheGetGroups, cacheSetGroups } from './idb';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function formatDateToDDMMYYYY(input) {
  // Accepts 'YYYY-MM-DD' or already 'DD-MM-YYYY'
  if (!input) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(input)) return input;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return input; // fallback
}

function authHeaders() {
  const { accessToken, refreshToken } = getTokens();
  const h = new Headers();
  if (accessToken) h.set('x-google-access-token', accessToken);
  if (refreshToken) h.set('x-google-refresh-token', refreshToken);
  
  if (!accessToken) {
    console.warn('⚠️ Authentication token missing');
  }
  
  return h;
}

// Helper to handle API responses and check for authentication errors
async function handleApiResponse(res) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    
    // Check if authentication expired
    if (res.status === 401 || errorData.error === 'AUTHENTICATION_EXPIRED') {
      console.error('🔒 Authentication expired - redirecting to login');
      // Clear stored tokens
      localStorage.removeItem('googleTokens');
      // Redirect to login
      window.location.href = '/login';
      throw new Error('AUTHENTICATION_EXPIRED');
    }
    
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

export async function ensureRoot() {
  const res = await fetch(`${API_BASE}/drive/root`, { headers: authHeaders() });
  return handleApiResponse(res);
}

export async function ensureFolder(date) {
  const url = new URL(`${API_BASE}/drive/folder`);
  url.searchParams.set('date', formatDateToDDMMYYYY(date));
  const res = await fetch(url, { headers: authHeaders() });
  return handleApiResponse(res);
}

export async function checkFolderExists(date) {
  try {
    const url = new URL(`${API_BASE}/drive/list`);
    url.searchParams.set('date', formatDateToDDMMYYYY(date));
    const res = await fetch(url, { headers: authHeaders() });
    // If we can list files, folder exists
    await res.json();
    return true;
  } catch {
    return false;
  }
}

export async function listByDate(date) {
  const url = new URL(`${API_BASE}/drive/list`);
  url.searchParams.set('date', formatDateToDDMMYYYY(date));
  const res = await fetch(url, { headers: authHeaders() });
  return handleApiResponse(res);
}

export async function upload(date, file) {
  const fd = new FormData();
  fd.append('date', formatDateToDDMMYYYY(date));
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/drive/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  });
  return handleApiResponse(res);
}

export function uploadWithProgress(date, file, onProgress, folderExists = true) {
  const fd = new FormData();
  fd.append('date', formatDateToDDMMYYYY(date));
  fd.append('file', file);
  const xhr = new XMLHttpRequest();
  const url = `${API_BASE}/drive/upload`;
  xhr.open('POST', url, true);
  
  // Get tokens and set headers
  const { accessToken, refreshToken } = getTokens();
  if (!accessToken) {
    console.error('No access token found - user may not be authenticated');
    const promise = Promise.reject(new Error('Not authenticated. Please log in again.'));
    return { xhr, promise };
  }
  
  xhr.setRequestHeader('x-google-access-token', accessToken);
  if (refreshToken) {
    xhr.setRequestHeader('x-google-refresh-token', refreshToken);
  }
  
  if (xhr.upload && typeof onProgress === 'function') {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        // If folder doesn't exist, folder creation is 0-50%, upload is 50-100%
        // If folder exists, upload is 0-100%
        const uploadPct = Math.round((e.loaded / e.total) * 100);
        const finalPct = folderExists ? uploadPct : 50 + Math.round(uploadPct / 2);
        onProgress(finalPct);
      }
    };
  }
  
  const promise = new Promise((resolve, reject) => {
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText || '{}')); }
          catch { resolve({}); }
        } else if (xhr.status === 401) {
          reject(new Error('Authentication failed. Please log in again.'));
        } else {
          reject(new Error(xhr.statusText || 'Upload failed'));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
  });
  xhr.send(fd);
  return { xhr, promise };
}

export async function listDates() {
  // Try the request even if navigator.onLine is false - it might be stale
  try {
    const res = await fetch(`${API_BASE}/drive/dates`, { headers: authHeaders() });
    return handleApiResponse(res);
  } catch (error) {
    // If truly offline, throw OFFLINE error
    if (!navigator.onLine || error.message.includes('Failed to fetch')) {
      throw new Error('OFFLINE');
    }
    throw error;
  }
}

export async function listAllGrouped(opts = {}) {
  const fresh = !!opts.fresh;
  
  // If forcing fresh, always try to fetch (even if navigator.onLine is stale)
  if (fresh) {
    try {
      const res = await listDates();
      const dates = (res.dates || []).map(d => d.date);
      const groups = [];
      for (const d of dates) {
        const filesRes = await listByDate(d);
        groups.push({ date: d, files: filesRes.files || [] });
      }
      // sort by date desc (DD-MM-YYYY)
      groups.sort((a, b) => {
        const [ad, am, ay] = a.date.split('-').map(Number);
        const [bd, bm, by] = b.date.split('-').map(Number);
        const at = new Date(ay, am - 1, ad).getTime();
        const bt = new Date(by, bm - 1, bd).getTime();
        return bt - at;
      });
      await cacheSetGroups(groups);
      return groups;
    } catch (error) {
      // If network error, return cached data as fallback
      if (error.message === 'OFFLINE' || !navigator.onLine) {
        console.log('[Drive] Network unavailable - returning cached data');
        const cached = await cacheGetGroups();
        return cached || [];
      }
      throw error;
    }
  }
  
  // Not forcing fresh - use cache if available
  const cached = await cacheGetGroups();
  if (cached && cached.length) {
    // Return cached immediately and refresh in background
    refreshGroupsInBackground();
    return cached;
  }
  
  // No cache - try to fetch
  
  const res = await listDates();
  const dates = (res.dates || []).map(d => d.date);
  const groups = [];
  for (const d of dates) {
    const filesRes = await listByDate(d);
    groups.push({ date: d, files: filesRes.files || [] });
  }
  // sort by date desc (DD-MM-YYYY)
  groups.sort((a, b) => {
    const [ad, am, ay] = a.date.split('-').map(Number);
    const [bd, bm, by] = b.date.split('-').map(Number);
    const at = new Date(ay, am - 1, ad).getTime();
    const bt = new Date(by, bm - 1, bd).getTime();
    return bt - at;
  });
  await cacheSetGroups(groups);
  return groups;
}

/**
 * Progressive loading: yields each group as it becomes available
 * This allows the UI to show folders incrementally instead of waiting for everything
 */
export async function* listAllGroupedProgressive(opts = {}) {
  const fresh = !!opts.fresh;
  
  // If we have cached data and not forcing fresh, yield it immediately
  if (!fresh) {
    const cached = await cacheGetGroups();
    if (cached && cached.length) {
      for (const group of cached) {
        yield group;
      }
      // Refresh in background for next time
      refreshGroupsInBackground();
      return;
    }
  }
  
  // Fetch dates list
  const res = await listDates();
  const dates = (res.dates || []).map(d => d.date);
  
  // Sort dates first so we yield in correct order (newest first)
  const sortedDates = dates.sort((a, b) => {
    const [ad, am, ay] = a.split('-').map(Number);
    const [bd, bm, by] = b.split('-').map(Number);
    const at = new Date(ay, am - 1, ad).getTime();
    const bt = new Date(by, bm - 1, bd).getTime();
    return bt - at;
  });
  
  const allGroups = [];
  
  // Fetch and yield each folder's files as they become available
  for (const date of sortedDates) {
    try {
      const filesRes = await listByDate(date);
      const group = { date, files: filesRes.files || [] };
      allGroups.push(group);
      yield group; // Yield immediately so UI can update
    } catch (error) {
      console.error(`Error loading folder ${date}:`, error);
      // Yield empty group so UI shows the date even if files failed to load
      const group = { date, files: [], error: true };
      allGroups.push(group);
      yield group;
    }
  }
  
  // Cache all groups once complete
  await cacheSetGroups(allGroups);
}

export async function deleteFile(fileId) {
  const res = await fetch(`${API_BASE}/drive/file/${fileId}`, { method: 'DELETE', headers: authHeaders() });
  return handleApiResponse(res);
}

export async function getFileBytes(fileId) {
  const res = await fetch(`${API_BASE}/drive/file/${fileId}`, { headers: authHeaders() });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    
    // Check if authentication expired
    if (res.status === 401 || errorData.error === 'AUTHENTICATION_EXPIRED') {
      console.error('🔒 Authentication expired - redirecting to login');
      localStorage.removeItem('googleTokens');
      window.location.href = '/login';
      throw new Error('AUTHENTICATION_EXPIRED');
    }
    
    throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
  }
  
  // Get file name from response headers if available
  const contentDisposition = res.headers.get('content-disposition');
  
  let fileName = 'document.pdf'; // Default fallback
  if (contentDisposition) {
    // Try different patterns to extract filename
    // Pattern 1: filename*=UTF-8''encoded-name (RFC 5987)
    let match = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (match) {
      try {
        fileName = decodeURIComponent(match[1]);
      } catch (e) {
        console.error('Error decoding filename');
      }
    }
    
    // Pattern 2: filename="quoted-name"
    if (fileName === 'document.pdf') {
      match = contentDisposition.match(/filename="([^"]+)"/i);
      if (match) {
        fileName = match[1];
      }
    }
    
    // Pattern 3: filename=unquoted-name
    if (fileName === 'document.pdf') {
      match = contentDisposition.match(/filename=([^;\s]+)/i);
      if (match) {
        let extracted = match[1].trim();
        // Remove quotes if any
        extracted = extracted.replace(/^["']|["']$/g, '');
        fileName = extracted;
      }
    }
  } else {
    console.warn('⚠️ Content-Disposition header not found');
  }
  
  const bytes = await res.arrayBuffer();
  
  return { bytes, fileName };
}

export async function updateFileBytes(fileId, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/drive/file/${fileId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: fd,
  });
  return handleApiResponse(res);
}

async function refreshGroupsInBackground() {
  try {
    const res = await listDates();
    const dates = (res.dates || []).map(d => d.date);
    const groups = [];
    for (const d of dates) {
      const filesRes = await listByDate(d);
      groups.push({ date: d, files: filesRes.files || [] });
    }
    groups.sort((a, b) => {
      const [ad, am, ay] = a.date.split('-').map(Number);
      const [bd, bm, by] = b.date.split('-').map(Number);
      return new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad);
    });
    await cacheSetGroups(groups);
  } catch {}
}

export async function getGroupForDate(date) {
  const filesRes = await listByDate(date);
  return { date: formatDateToDDMMYYYY(date), files: filesRes.files || [] };
}


