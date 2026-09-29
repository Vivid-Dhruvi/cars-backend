const { connectToDatabase } = require('../config/db');
const Inspection = require('../models/Inspection');
const { analyzeVehiclePhotos } = require('../services/aiInspectionService');

async function analyzeInspection(req, res) {
  try {
    await connectToDatabase();
    const { vehicleData, photos } = req.body;
    const inspectionId = 'INS-' + Date.now();

    const inspectionResults = await analyzeVehiclePhotos({
      vehicleData,
      photos,
      inspectionId
    });

    inspectionResults.inspection_id = inspectionId;
    inspectionResults.vehicle_info = vehicleData || {};
    inspectionResults.is_paid = false;

    // Safety check against MongoDB 16MB BSON document limit
    let photosToSave = photos || {};
    try {
      const estimatedBytes = Buffer.byteLength(JSON.stringify(photosToSave), 'utf8');
      if (estimatedBytes > 10 * 1024 * 1024) {
        console.warn(`⚠️ Large photo payload (${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB). Optimizing storage for MongoDB document limit.`);
        const neededAngles = new Set(
          (inspectionResults.findings || []).flatMap(f => f.supporting_images || []).map(s => s.replace(/\D/g, '').padStart(2, '0'))
        );
        const trimmed = {};
        for (const [k, v] of Object.entries(photosToSave)) {
          const padded = k.replace(/\D/g, '').padStart(2, '0');
          if (neededAngles.has(padded)) {
            trimmed[k] = v;
          } else {
            trimmed[k] = { filename: `IMAGE_${padded}`, angle: padded, captured: true };
          }
        }
        photosToSave = trimmed;
      }
    } catch (sizeErr) {
      console.warn('Photo size check warning:', sizeErr.message);
    }
    inspectionResults.photos = photosToSave;

    await Inspection.findOneAndUpdate(
      { inspection_id: inspectionId },
      inspectionResults,
      { upsert: true, returnDocument: 'after' }
    );

    res.json({
      success: true,
      inspectionId,
      summary: inspectionResults.inspection_summary,
      previewFindings: (inspectionResults.findings || []).slice(0, 3),
      fullResults: inspectionResults
    });
  } catch (error) {
    console.error('AI Vision Inspection Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getInspectionById(req, res) {
  try {
    await connectToDatabase();
    const record = await Inspection.findOne({ inspection_id: req.params.id }).lean();
    if (!record) {
      return res.status(404).json({ success: false, error: 'Inspection session not found' });
    }
    res.json({ success: true, inspection: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  analyzeInspection,
  getInspectionById,
};
