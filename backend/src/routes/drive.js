const express = require('express');
const multer = require('multer');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const upload = multer({ storage: multer.memoryStorage() });
const { findRootFolder, ensureRootFolder, ensureDateFolder, listFilesByDate, uploadPdf, getFileBytes, updateFileBytes, deleteFile, getChanges, listDateFolders } = require('../services/driveService');

router.get('/root', requireAuth, async (req, res, next) => {
  try {
    const folderId = await findRootFolder(req.oauthTokens);
    res.json({ folderId });
  } catch (err) { next(err); }
});
router.get('/dates', requireAuth, async (req, res, next) => {
  try {
    const dates = await listDateFolders(req.oauthTokens);
    res.json({ dates });
  } catch (err) { next(err); }
});


router.get('/folder', requireAuth, async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    const folderId = await ensureDateFolder(req.oauthTokens, date);
    res.json({ folderId });
  } catch (err) { next(err); }
});

router.get('/list', requireAuth, async (req, res, next) => {
  try {
    const { date } = req.query;
    const files = await listFilesByDate(req.oauthTokens, date);
    res.json({ files });
  } catch (err) { next(err); }
});

router.post('/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { date } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Missing file' });
    const result = await uploadPdf(req.oauthTokens, date, file);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/file/:fileId', requireAuth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { data, mimeType, fileName } = await getFileBytes(req.oauthTokens, fileId);
    res.setHeader('Content-Type', mimeType || 'application/pdf');
    if (fileName) {
      // Use both formats for better compatibility
      const encodedFileName = encodeURIComponent(fileName);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`);
    }
    res.send(Buffer.from(data));
  } catch (err) { next(err); }
});

router.put('/file/:fileId', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Missing file' });
    const result = await updateFileBytes(req.oauthTokens, fileId, file);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/file/:fileId', requireAuth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const ok = await deleteFile(req.oauthTokens, fileId);
    res.json({ ok });
  } catch (err) { next(err); }
});

router.get('/changes', requireAuth, async (req, res, next) => {
  try {
    const { syncToken } = req.query;
    const changes = await getChanges(req.oauthTokens, syncToken);
    res.json(changes);
  } catch (err) { next(err); }
});

module.exports = router;

