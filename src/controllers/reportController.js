const { connectToDatabase } = require('../config/db');
const Inspection = require('../models/Inspection');
const { generateInspectionPdf } = require('../services/pdfService');
const { sendInspectionReportEmail } = require('../services/emailService');

async function streamPdfReport(req, res) {
  try {
    await connectToDatabase();
    const inspectionId = req.params.id;
    const record = (await Inspection.findOne({ inspection_id: inspectionId }).lean()) || {
      inspection_id: inspectionId,
      findings: [],
      created_at: new Date()
    };

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

module.exports = {
  streamPdfReport,
  sendEmailReport,
};
