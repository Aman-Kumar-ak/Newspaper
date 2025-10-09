// Minimal IndexedDB helpers for caching groups and files

const DB_NAME = 'newspapers-db';
const DB_VERSION = 2; // Bump version for new store
const STORE_GROUPS = 'groups';
const STORE_PDFS = 'pdfs';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GROUPS)) db.createObjectStore(STORE_GROUPS);
      if (!db.objectStoreNames.contains(STORE_PDFS)) db.createObjectStore(STORE_PDFS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
// Cache a PDF file (ArrayBuffer or Blob) by fileId
export async function cacheSetPdf(fileId, fileBytes, fileName) {
  const db = await openDb();
  const tx = db.transaction(STORE_PDFS, 'readwrite');
  tx.objectStore(STORE_PDFS).put({ fileBytes, fileName, timestamp: Date.now() }, fileId);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Get a cached PDF file by fileId
export async function cacheGetPdf(fileId) {
  const db = await openDb();
  const tx = db.transaction(STORE_PDFS, 'readonly');
  const req = tx.objectStore(STORE_PDFS).get(fileId);
  const result = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

// Get all cached PDF file IDs
export async function cacheGetAllPdfIds() {
  const db = await openDb();
  const tx = db.transaction(STORE_PDFS, 'readonly');
  const req = tx.objectStore(STORE_PDFS).getAllKeys();
  const result = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function cacheSetGroups(groups) {
  const db = await openDb();
  const tx = db.transaction(STORE_GROUPS, 'readwrite');
  // Ensure all dates are stored as DD-MM-YYYY
  const normalized = (groups || []).map(g => ({ ...g, date: normalizeToDDMMYYYY(g.date) }));
  tx.objectStore(STORE_GROUPS).put(normalized, 'all');
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function cacheGetGroups() {
  const db = await openDb();
  const tx = db.transaction(STORE_GROUPS, 'readonly');
  const req = tx.objectStore(STORE_GROUPS).get('all');
  const result = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  // Normalize in case of old cache entries
  return (result || []).map(g => ({ ...g, date: normalizeToDDMMYYYY(g.date) }));
}

function normalizeToDDMMYYYY(input) {
  if (!input) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(input)) return input;
  const m = String(input).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return input;
}

