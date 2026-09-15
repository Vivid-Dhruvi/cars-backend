const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { uploadPhoto, ocrContract } = require('../controllers/uploadController');

const uploadsDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/upload', upload.single('photo'), uploadPhoto);
router.post('/ocr/contract', upload.single('contract'), ocrContract);

module.exports = router;
