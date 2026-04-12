/**
 * File upload middleware (Multer).
 *
 * Reads allowed extensions and size limits from config — no magic numbers here.
 * Files are stored in the local `uploads/` directory with UUID filenames.
 */

'use strict';

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const ext = file.originalname.split('.').pop().toLowerCase();
    cb(null, `${uuidv4().replace(/-/g, '')}.${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (!config.upload.allowedExtensions.has(ext)) {
    const err = new Error(
      `File type ".${ext}" is not allowed. Accepted: ${[...config.upload.allowedExtensions].join(', ')}`
    );
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSizeBytes },
});

module.exports = { upload };
