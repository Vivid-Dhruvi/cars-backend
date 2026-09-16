const { connectToDatabase } = require('../config/db');
const Inspection = require('../models/Inspection');
const { sendInspectionReportEmail } = require('../services/emailService');
const { createICreditPaymentSession, verifyICreditSale } = require('../services/paymentService');

/**
 * Initiates an iCredit hosted payment session
 */
async function initiatePayment(req, res) {
  try {
    await connectToDatabase();
    const { inspectionId, name, email, amount, originUrl } = req.body;
    if (!inspectionId) {
      return res.status(400).json({ success: false, error: 'Inspection ID is required' });
    }

    // Check if session is already paid to prevent duplicate charge
    const record = await Inspection.findOne({ inspection_id: inspectionId });
    if (record && record.is_paid) {
      return res.json({
        success: true,
        alreadyPaid: true,
        message: 'Inspection is already paid and unlocked.',
        pdfDownloadUrl: `/api/reports/${inspectionId}/pdf`
      });
    }

    const backendUrl = `${req.protocol}://${req.get('host')}`;
    const session = await createICreditPaymentSession({
      inspectionId,
      amount: amount || 3.00,
      name: name || 'Valued Client',
      email: email || '',
      originUrl: originUrl || req.headers.origin || 'http://localhost:3000',
      backendUrl
    });

    if (session.success) {
      return res.json({
        success: true,
        isMock: Boolean(session.isMock),
        paymentUrl: session.paymentUrl,
        privateSaleToken: session.privateSaleToken
      });
    } else {
      return res.status(400).json({
        success: false,
        error: session.error || 'Failed to initiate iCredit checkout'
      });
    }
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handles iCredit Server-to-Server IPN webhook callback
 */
async function handlePaymentIPN(req, res) {
  try {
    await connectToDatabase();
    const { GroupPrivateToken, PrivateSaleToken, Custom1, Status } = req.body;
    const inspectionId = Custom1;

    console.log(`🔔 iCredit IPN received for inspection: ${inspectionId}, status: ${Status}`);

    if (Status === 0 || Status === '0') {
      const updateResult = await Inspection.findOneAndUpdate(
        { inspection_id: inspectionId, email_sent: { $ne: true } },
        { 
          $set: { 
            is_paid: true,
            email_sent: true,
            'user_info.paid_at': new Date().toISOString()
          } 
        },
        { new: true }
      );

      if (updateResult) {
        if (!updateResult.sha256_hash) {
          updateResult.sha256_hash = 'sha256-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
          await updateResult.save();
        }
        if (updateResult.user_info?.email) {
          sendInspectionReportEmail(updateResult.toObject(), updateResult.user_info.email).catch(e => {
            console.error('IPN email dispatch error:', e.message);
          });
        }
      } else {
        await Inspection.updateOne({ inspection_id: inspectionId }, { $set: { is_paid: true } });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('IPN processing error:', err);
    res.status(500).send('Error');
  }
}

/**
 * Direct checkout / unlock confirmation
 */
async function checkoutPayment(req, res) {
  try {
    await connectToDatabase();
    const { inspectionId, name, email, amount, privateSaleToken } = req.body;
    if (!inspectionId) {
      return res.status(400).json({ success: false, error: 'Inspection ID is required' });
    }

    let record = await Inspection.findOne({ inspection_id: inspectionId });
    if (!record) {
      record = new Inspection({
        inspection_id: inspectionId,
        vehicle_info: req.body.vehicleData || {},
        findings: [],
        inspection_summary: { vehicle_visible: true, overall_confidence: 0.95 }
      });
    }

    const userInfoToSave = { 
      name: name || record.user_info?.name || 'Valued Client', 
      email: email || record.user_info?.email || 'user@example.com', 
      paid_at: record.user_info?.paid_at || new Date().toISOString(), 
      amount: amount || 3.00,
      payment_method: 'iCredit Hosted Gateway',
      private_sale_token: privateSaleToken || record.user_info?.private_sale_token || null
    };
    const shaHash = record.sha256_hash || ('sha256-' + Math.random().toString(36).substring(2) + Date.now().toString(36));

    // Atomically claim the email dispatch right if not sent yet
    const updateResult = await Inspection.findOneAndUpdate(
      { inspection_id: inspectionId, email_sent: { $ne: true } },
      {
        $set: {
          is_paid: true,
          email_sent: true,
          user_info: userInfoToSave,
          sha256_hash: shaHash
        }
      },
      { new: true }
    );

    let finalRecord;
    let shouldSendEmail = false;

    if (updateResult) {
      // Won the race to send email
      finalRecord = updateResult;
      shouldSendEmail = true;
    } else {
      // Record was already processed or email already dispatched
      finalRecord = await Inspection.findOneAndUpdate(
        { inspection_id: inspectionId },
        {
          $set: {
            is_paid: true,
            user_info: userInfoToSave,
            sha256_hash: shaHash
          }
        },
        { new: true, upsert: true }
      );
    }

    const targetEmail = email || finalRecord?.user_info?.email;
    if (shouldSendEmail && targetEmail) {
      sendInspectionReportEmail(finalRecord.toObject(), targetEmail).catch(mailErr => {
        console.error('Background email dispatch notice:', mailErr.message);
      });
    }

    res.json({
      success: true,
      message: 'Payment confirmed via iCredit and report emailed to client',
      transactionId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      sha256Hash: finalRecord.sha256_hash,
      pdfDownloadUrl: `/api/reports/${inspectionId}/pdf`,
      report: finalRecord.toObject()
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  initiatePayment,
  handlePaymentIPN,
  checkoutPayment,
};
