const fs = require('fs');
const path = require('path');
const os = require('os');

// Base directory for uploads: Cloudways / local disk filesystem
const uploadsBaseDir = process.env.VERCEL 
  ? os.tmpdir() 
  : path.resolve(__dirname, '../../uploads');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Saves uploaded photos to local server disk (Cloudways / local filesystem)
 * Keeps original high-res images for future AI training while keeping MongoDB lightweight.
 * 
 * @param {string} inspectionId
 * @param {Object} photosDict - Object mapping photo IDs to base64 strings or photo objects
 * @returns {Promise<Object>} Clean metadata object with disk URLs for each photo
 */
async function saveInspectionPhotos(inspectionId, photosDict) {
  if (!photosDict || typeof photosDict !== 'object') {
    return {};
  }

  const inspectionUploadDir = path.join(uploadsBaseDir, 'inspections', inspectionId);
  ensureDirExists(inspectionUploadDir);

  const storedMetadata = {};

  for (const [key, photoValue] of Object.entries(photosDict)) {
    try {
      let base64Data = '';
      let format = 'jpg';

      if (typeof photoValue === 'string') {
        base64Data = photoValue;
      } else if (photoValue && typeof photoValue === 'object') {
        base64Data = photoValue.data || photoValue.url || photoValue.base64 || '';
      }

      if (!base64Data) continue;

      // Extract format if data URL
      const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        format = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
        base64Data = matches[2];
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${key}.${format}`;
      const filePath = path.join(inspectionUploadDir, filename);

      await fs.promises.writeFile(filePath, buffer);

      const digits = key.replace(/\D/g, '');
      const padded = digits ? digits.padStart(2, '0') : '01';

      const photoMeta = {
        filename,
        angle: padded,
        url: `/uploads/inspections/${inspectionId}/${filename}`,
        sizeBytes: buffer.length,
        captured: true,
        saved_at: new Date().toISOString()
      };

      const canonicalKey = `IMAGE_${padded}`;
      storedMetadata[canonicalKey] = photoMeta;
    } catch (err) {
      console.error(`⚠️ Failed to save image ${key} for inspection ${inspectionId}:`, err.message);
    }
  }

  console.log(`💾 Saved ${Object.keys(storedMetadata).length} inspection images to disk: ${inspectionUploadDir}`);
  return storedMetadata;
}

/**
 * Saves a generated PDF certificate buffer to local server disk
 * @param {string} inspectionId
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string>} Public relative URL to PDF file
 */
async function saveInspectionPdf(inspectionId, pdfBuffer) {
  try {
    const reportsDir = path.join(uploadsBaseDir, 'reports');
    ensureDirExists(reportsDir);

    const filename = `${inspectionId}.pdf`;
    const filePath = path.join(reportsDir, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);

    console.log(`💾 Saved PDF certificate to disk: ${filePath}`);
    return `/uploads/reports/${filename}`;
  } catch (err) {
    console.error(`⚠️ Failed to save PDF certificate for inspection ${inspectionId}:`, err.message);
    return null;
  }
}

module.exports = {
  saveInspectionPhotos,
  saveInspectionPdf,
  uploadsBaseDir
};
