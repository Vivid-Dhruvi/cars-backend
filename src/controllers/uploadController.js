function uploadPhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file uploaded' });
  }
  const PORT = process.env.PORT || 5000;
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
}

function ocrContract(req, res) {
  res.json({
    success: true,
    data: {
      company: 'Avis Rent a Car',
      makeModel: 'Hyundai i30',
      plateNumber: 'ABC-123',
      agreementRef: 'CIR-8841-AE'
    }
  });
}

module.exports = {
  uploadPhoto,
  ocrContract,
};
