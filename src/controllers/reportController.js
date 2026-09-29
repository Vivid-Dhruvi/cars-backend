const { connectToDatabase } = require('../config/db');
const Inspection = require('../models/Inspection');
const { generateInspectionPdf } = require('../services/pdfService');
const { sendInspectionReportEmail } = require('../services/emailService');

async function streamPdfReport(req, res) {
  try {
    await connectToDatabase();
    const inspectionId = req.params.id;
    const record = await Inspection.findOne({ inspection_id: inspectionId }).lean();
    
    if (!record) {
      if (inspectionId === 'INS-CLEAN') {
        return generateInspectionPdf({
          inspection_id: 'INS-CLEAN',
          findings: [],
          created_at: new Date()
        }, res);
      }
      return res.status(404).json({ success: false, error: 'Inspection record not found' });
    }

    const hasDamage = Array.isArray(record.findings) && record.findings.length > 0;
    if (hasDamage && !record.is_paid) {
      return res.status(402).json({
        success: false,
        error: 'Payment required to download official damage inspection certificate.'
      });
    }

    generateInspectionPdf(record, res);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function sendEmailReport(req, res) {
  try {
    await connectToDatabase();
    const inspectionId = req.params.id;
    const targetEmail = req.body?.email;

    const record = await Inspection.findOne({ inspection_id: inspectionId }).lean();
    if (!record) {
      return res.status(404).json({ success: false, error: 'Inspection session not found' });
    }

    const emailResult = await sendInspectionReportEmail(record, targetEmail);
    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: emailResult.error });
    }

    res.json({
      success: true,
      message: `Inspection certificate emailed successfully to ${emailResult.recipient}`,
      messageId: emailResult.messageId
    });
  } catch (error) {
    console.error('Manual email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getReportById(req, res) {
  try {
    await connectToDatabase();
    const inspectionId = req.params.id;
    const record = await Inspection.findOne({ inspection_id: inspectionId }).lean();
    if (!record) {
      return res.status(404).json({ success: false, error: 'Inspection session not found' });
    }
    res.json({
      success: true,
      report: record
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function generatePdfFromData(req, res) {
  try {
    const { vehicleData, analysisResults, photos, userInfo } = req.body;
    
    // Construct a record structure that pdfService expects
    const record = {
      inspection_id: vehicleData?.inspection_id || `REQ-${Date.now()}`,
      findings: analysisResults?.findings || [],
      uncertain_findings: analysisResults?.uncertain_findings || [],
      vehicle_info: vehicleData || {},
      user_info: userInfo || {},
      photos: photos || {},
      overall_assessment: analysisResults?.overall_assessment || '',
      undamaged_visible_parts: analysisResults?.undamaged_visible_parts || [],
      sha256_hash: analysisResults?.sha256_hash || null,
      created_at: new Date()
    };

    generateInspectionPdf(record, res);
  } catch (error) {
    console.error('Dynamic PDF Generation Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getReportById,
  streamPdfReport,
  sendEmailReport,
  generatePdfFromData,
};
