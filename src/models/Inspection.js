const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
  inspection_id: { type: String, required: true, unique: true, index: true },
  vehicle_info: { type: Object, default: {} },
  user_info: { type: Object, default: {} },
  inspection_summary: { type: Object, default: {} },
  findings: { type: Array, default: [] },
  photos: { type: Object, default: {} },
  undamaged_visible_parts: { type: Array, default: [] },
  overall_assessment: { type: String, default: '' },
  is_paid: { type: Boolean, default: false },
  sha256_hash: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const Inspection = mongoose.models.Inspection || mongoose.model('Inspection', inspectionSchema);

module.exports = Inspection;
