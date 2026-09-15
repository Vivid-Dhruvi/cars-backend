const { connectToDatabase } = require('../config/db');
const Inspection = require('../models/Inspection');

async function getAllInspections(req, res) {
  try {
    await connectToDatabase();
    const list = await Inspection.find().sort({ created_at: -1 }).lean();
    res.json({ success: true, count: list.length, inspections: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function clearAllInspections(req, res) {
  try {
    await connectToDatabase();
    await Inspection.deleteMany({});
    res.json({ success: true, message: 'All inspections cleared from database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllInspections,
  clearAllInspections,
};
