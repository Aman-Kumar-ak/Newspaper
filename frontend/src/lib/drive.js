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
  return h;
}

export async function ensureRoot() {
  const res = await fetch(`${API_BASE}/drive/root`, { headers: authHeaders() });
  return res.json();
}

export async function ensureFolder(date) {
  const url = new URL(`${API_BASE}/drive/folder`);
  url.searchParams.set('date', formatDateToDDMMYYYY(date));
  const res = await fetch(url, { headers: authHeaders() });
  return res.json();
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
  return res.json();
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
  return res.json();
}

export function uploadWithProgress(date, file, onProgress, folderExists = true) {
  const fd = new FormData();
  fd.append('date', formatDateToDDMMYYYY(date));
  fd.append('file', file);
  const xhr = new XMLHttpRequest();
  const url = `${API_BASE}/drive/upload`;
  xhr.open('POST', url, true);
  const headers = authHeaders();
  for (const [k, v] of headers.entries()) xhr.setRequestHeader(k, v);
  
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
  const res = await fetch(`${API_BASE}/drive/dates`, { headers: authHeaders() });
  return res.json();
}

export async function listAllGrouped(opts = {}) {
  const fresh = !!opts.fresh;
  if (!fresh) {
    const cached = await cacheGetGroups();
    if (cached && cached.length) {
      // Return cached immediately and refresh in background
      refreshGroupsInBackground();
      return cached;
    }
  }
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

export async function deleteFile(fileId) {
  const res = await fetch(`${API_BASE}/drive/file/${fileId}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

export async function getFileBytes(fileId) {
  console.log('getFileBytes called with fileId:', fileId);
  console.log('API_BASE:', API_BASE);
  console.log('Auth headers:', authHeaders());
  
  const res = await fetch(`${API_BASE}/drive/file/${fileId}`, { headers: authHeaders() });
  console.log('Response status:', res.status);
  console.log('Response headers:', res.headers);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error response body:', errorText);
    throw new Error(`Failed to fetch file: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  // Get file name from response headers if available
  const contentDisposition = res.headers.get('content-disposition');
  console.log('Content-Disposition header:', contentDisposition);
  
  let fileName = 'document.pdf'; // Default fallback
  if (contentDisposition) {
    // Try different patterns to extract filename
    const patterns = [
      /filename\*=UTF-8''([^;\s]+)/,  // RFC 5987 format (try first)
      /filename="([^"]+)"/,            // Quoted format
      /filename=([^;\s]+)/             // Unquoted format
    ];
    
    for (const pattern of patterns) {
      const match = contentDisposition.match(pattern);
      if (match) {
        let extracted = match[1].trim();
        // Remove quotes if present
        extracted = extracted.replace(/^"|"$/g, '');
        // Decode if it's URL encoded
        try {
          fileName = decodeURIComponent(extracted);
          console.log('Successfully extracted filename:', fileName);
          break;
        } catch (e) {
          fileName = extracted;
          console.log('Using unencoded filename:', fileName);
          break;
        }
      }
    }
  }
  
  console.log('Extracted filename:', fileName);
  
  const bytes = await res.arrayBuffer();
  console.log('Received bytes length:', bytes.byteLength);
  
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
  if (!res.ok) {
    throw new Error(`Failed to update file: ${res.status} ${res.statusText}`);
  }
  return res.json();
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


