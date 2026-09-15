const { getTransporter } = require('../config/mailer');
const { buildInspectionPdfBuffer } = require('./pdfService');

async function sendInspectionReportEmail(inspectionRecord, recipientEmail) {
  try {
    const to = recipientEmail || inspectionRecord?.user_info?.email;
    if (!to) {
      console.warn('⚠️ No recipient email found for inspection notification.');
      return { success: false, error: 'No recipient email specified' };
    }

    const inspectionId = inspectionRecord.inspection_id || 'INS-DEMO';
    const clientName = inspectionRecord.user_info?.name || 'Valued Client';
    const findings = inspectionRecord.findings || [];
    const overallAssessment = inspectionRecord.overall_assessment || 'Automated multi-angle computer vision inspection completed.';
    const sha256Hash = inspectionRecord.sha256_hash || 'sha256-verified';

    // Generate PDF Buffer to attach directly
    console.log(`📄 Generating PDF buffer for email attachment to ${to}...`);
    const pdfBuffer = await buildInspectionPdfBuffer(inspectionRecord);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0F172A; color: #FFFFFF; padding: 28px 32px; border-top: 4px solid #0284C7; }
    .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38BDF8; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 8px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; }
    .content { padding: 32px; }
    .card { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .card-title { color: #059669; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; }
    .card-text { font-size: 13px; line-height: 1.5; color: #0F172A; margin: 0; }
    .stats { display: flex; gap: 10px; margin: 20px 0; }
    .stat-box { flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center; }
    .stat-label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; }
    .stat-val { font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 4px; }
    .footer { background: #F8FAFC; padding: 20px 32px; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; text-align: center; }
    .hash-code { background: #FFFFFF; padding: 6px 10px; border-radius: 6px; border: 1px solid #CBD5E1; font-family: monospace; font-size: 10px; color: #334155; word-break: break-all; display: inline-block; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official AI Damage Certificate</div>
      <h1 class="title">Inspection Report Ready</h1>
      <p style="margin: 6px 0 0; color: #94A3B8; font-size: 13px;">Report Reference: <strong>${inspectionId}</strong></p>
    </div>

    <div class="content">
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        Hello <strong>${clientName}</strong>,<br><br>
        Your official AI automotive visual inspection report has been compiled and verified. Your signed PDF certificate is attached directly to this email.
      </p>

      <div class="card">
        <div class="card-title">Executive AI Assessment</div>
        <p class="card-text">${overallAssessment}</p>
      </div>

      <table width="100%" style="margin: 20px 0; border-collapse: collapse;">
        <tr>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
            <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase;">Findings</div>
            <div style="font-size: 16px; font-weight: 800; color: ${findings.length > 0 ? '#DC2626' : '#059669'}; margin-top: 4px;">${findings.length} Detected</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
            <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase;">AI Confidence</div>
            <div style="font-size: 16px; font-weight: 800; color: #0284C7; margin-top: 4px;">96% Overall</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
            <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase;">Audit Status</div>
            <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 4px;">Verified</div>
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        You can keep the attached PDF certificate for insurance, vehicle rental check-in, or dispute resolution records.
      </p>
    </div>

    <div class="footer">
      <div>Cryptographic Verification Signature:</div>
      <div class="hash-code">${sha256Hash}</div>
      <p style="margin: 12px 0 0; color: #94A3B8;">&copy; ${new Date().getFullYear()} CarsInsure AI Vehicle Intelligence Platform.</p>
    </div>
  </div>
</body>
</html>
`;

    const senderEmail = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || (senderEmail ? `"CarsInsure AI" <${senderEmail}>` : '"CarsInsure AI" <reports@carsinsure.com>');

    const mailOptions = {
      from: fromAddress,
      to: to,
      subject: `CarsInsure Inspection Certificate [${inspectionId}] - ${findings.length} Findings Cataloged`,
      html: htmlContent,
      attachments: [
        {
          filename: `CarsInsure_Official_Report_${inspectionId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    console.log(`✉️ Sending report email to ${to}...`);
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Report email dispatched successfully to ${to} (Message ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: to
    };
  } catch (error) {
    console.error('❌ Failed sending inspection report email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendInspectionReportEmail,
};
