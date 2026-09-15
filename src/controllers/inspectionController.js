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
    inspectionResults.photos = photos;

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
