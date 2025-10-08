// Google Drive operations using googleapis v3
const { google } = require('googleapis');
const { getOAuthClient } = require('../config/google');

const ROOT_FOLDER_NAME = process.env.ROOT_FOLDER_NAME || 'MyNewspapers';

function getDrive(tokens) {
  const auth = getOAuthClient();
  if (tokens) auth.setCredentials(tokens);
  return google.drive({ version: 'v3', auth });
}

async function findRootFolder(tokens) {
  const drive = getDrive(tokens);
  const q = `mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name)' });
  return (data.files && data.files.length) ? data.files[0].id : null;
}

async function ensureRootFolder(tokens) {
  const drive = getDrive(tokens);
  const q = `mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name)' });
  if (data.files && data.files.length) return data.files[0].id;
  const res = await drive.files.create({
    requestBody: { name: ROOT_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return res.data.id;
}

function normalizeToDDMMYYYY(dateStr) {
  // Accept both DD-MM-YYYY and YYYY-MM-DD, store as DD-MM-YYYY in Drive
  const ddmm = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmm) return dateStr;
  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  return dateStr;
}

async function ensureDateFolder(tokens, dateStr) {
  const normalized = normalizeToDDMMYYYY(dateStr);
  const rootId = await ensureRootFolder(tokens);
  const drive = getDrive(tokens);
  const q = `mimeType='application/vnd.google-apps.folder' and name='${normalized}' and '${rootId}' in parents and trashed=false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name)' });
  if (data.files && data.files.length) return data.files[0].id;
  const res = await drive.files.create({
    requestBody: { name: normalized, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] },
    fields: 'id',
  });
  return res.data.id;
}

async function listFilesByDate(tokens, dateStr) {
  const folderId = await ensureDateFolder(tokens, dateStr);
  const drive = getDrive(tokens);
  const q = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name, modifiedTime, md5Checksum)' });
  return (data.files || []).map(f => ({
    fileId: f.id,
    fileName: f.name,
    folderDate: normalizeToDDMMYYYY(dateStr),
    lastModifiedTime: f.modifiedTime,
    md5Checksum: f.md5Checksum,
  }));
}

async function uploadPdf(tokens, dateStr, file) {
  const folderId = await ensureDateFolder(tokens, dateStr);
  const drive = getDrive(tokens);
  const { Readable } = require('stream');
  const stream = Readable.from(file.buffer);
  const res = await drive.files.create({
    requestBody: { name: file.originalname || 'document.pdf', parents: [folderId] },
    media: { mimeType: 'application/pdf', body: stream },
    fields: 'id, name, modifiedTime, md5Checksum',
  });
  return {
    fileId: res.data.id,
    revisionId: undefined,
    fileName: res.data.name,
    folderDate: dateStr,
    lastModifiedTime: res.data.modifiedTime,
    md5Checksum: res.data.md5Checksum,
  };
}

async function getFileBytes(tokens, fileId) {
  const drive = getDrive(tokens);
  // First get file metadata to get the name
  const metaRes = await drive.files.get({ fileId, fields: 'name' });
  // Then get file content
  const dataRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return { 
    data: dataRes.data, 
    mimeType: 'application/pdf',
    fileName: metaRes.data.name
  };
}

async function updateFileBytes(tokens, fileId, file) {
  const drive = getDrive(tokens);
  const { Readable } = require('stream');
  const stream = Readable.from(file.buffer);
  const res = await drive.files.update({ fileId, media: { mimeType: 'application/pdf', body: stream } , fields: 'id, modifiedTime, md5Checksum'});
  return { fileId: res.data.id, revisionId: undefined, lastModifiedTime: res.data.modifiedTime, md5Checksum: res.data.md5Checksum };
}

async function deleteFile(tokens, fileId) {
  const drive = getDrive(tokens);
  await drive.files.update({ fileId, requestBody: { trashed: true } });
  return true;
}

async function getChanges(tokens, syncToken) {
  // Placeholder for MVP
  return { nextSyncToken: syncToken || null, changes: [] };
}

async function listDateFolders(tokens) {
  const rootId = await findRootFolder(tokens);
  if (!rootId) return [];
  const drive = getDrive(tokens);
  const q = `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name)' });
  return (data.files || []).map(f => ({ folderId: f.id, date: normalizeToDDMMYYYY(f.name) }));
}


// Delete a folder (by date) from Google Drive (move to trash)
async function deleteFolderByDate(tokens, dateStr) {
  const normalized = normalizeToDDMMYYYY(dateStr);
  const rootId = await findRootFolder(tokens);
  if (!rootId) throw new Error('Root folder not found');
  const drive = getDrive(tokens);
  // Find the folder with the given date under the root
  const q = `mimeType='application/vnd.google-apps.folder' and name='${normalized}' and '${rootId}' in parents and trashed=false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name)' });
  if (!data.files || !data.files.length) throw new Error('Date folder not found');
  const folderId = data.files[0].id;
  // Move the folder to trash
  await drive.files.update({ fileId: folderId, requestBody: { trashed: true } });
  return true;
}

module.exports = { findRootFolder, ensureRootFolder, ensureDateFolder, listFilesByDate, uploadPdf, getFileBytes, updateFileBytes, deleteFile, getChanges, listDateFolders, deleteFolderByDate };


