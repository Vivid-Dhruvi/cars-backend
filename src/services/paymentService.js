const ICREDIT_SANDBOX_ENDPOINT = 'https://testicredit.rivhit.co.il/API/PaymentPageRequest.svc';
const ICREDIT_PROD_ENDPOINT = 'https://icredit.rivhit.co.il/API/PaymentPageRequest.svc';

function getICreditBaseUrl() {
  const env = (process.env.ICREDIT_ENV || '').toLowerCase();
  return env === 'production' ? ICREDIT_PROD_ENDPOINT : ICREDIT_SANDBOX_ENDPOINT;
}

/**
 * Creates an iCredit Hosted Payment Page session
 * @param {Object} params
 * @param {string} params.inspectionId
 * @param {number} params.amount
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.originUrl
 * @param {string} params.backendUrl
 */
async function createICreditPaymentSession({ inspectionId, amount, name, email, originUrl, backendUrl }) {
  const token = process.env.ICREDIT_GROUP_PRIVATE_TOKEN || process.env.ICREDIT_API_KEY;
  const isConfigured = token && token !== 'your_icredit_api_key_here' && token !== 'Value';
  const unitPrice = parseFloat(amount || 3.00);

  if (!isConfigured) {
    console.warn('⚠️ iCredit GroupPrivateToken unconfigured or set to placeholder. Running in test mock mode.');
    return {
      success: true,
      isMock: true,
      paymentUrl: null,
      message: 'iCredit running in local test mode'
    };
  }

  const endpoint = `${getICreditBaseUrl()}/GetUrl`;
  const redirectSuccessUrl = `${originUrl || 'http://localhost:3000'}/?inspectionId=${inspectionId}&payment=success`;
  const redirectFailUrl = `${originUrl || 'http://localhost:3000'}/?inspectionId=${inspectionId}&payment=failed`;
  const ipnUrl = `${backendUrl || 'http://localhost:5000'}/api/payment/ipn`;

  const payload = {
    GroupPrivateToken: token.trim(),
    Items: [
      {
        Id: 1,
        CatalogNumber: `INSP-${inspectionId.slice(-6)}`,
        Quantity: 1,
        UnitPrice: unitPrice,
        Description: 'CarsInsure AI Vehicle Damage Certificate'
      }
    ],
    RedirectURL: redirectSuccessUrl,
    FailRedirectURL: redirectFailUrl,
    IPNURL: ipnUrl,
    CustomerFirstName: name || 'Client',
    EmailAddress: email || '',
    Currency: parseInt(process.env.ICREDIT_CURRENCY || '2', 10), // 2 = USD, 1 = ILS
    Language: process.env.ICREDIT_LANGUAGE || 'en',
    Custom1: inspectionId,
    HideItemList: false,
    ExemptVAT: true
  };

  try {
    console.log(`💳 Requesting iCredit payment URL for Inspection ${inspectionId} ($${unitPrice})...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('iCredit Gateway Response:', data);

    if (data && data.Status === 0 && data.URL) {
      return {
        success: true,
        paymentUrl: data.URL,
        privateSaleToken: data.PrivateSaleToken,
        publicSaleToken: data.PublicSaleToken
      };
    } else {
      const errMsg = data?.DebugMessage || data?.UserMessage || `iCredit error status ${data?.Status}`;
      console.error('iCredit payment page generation error:', errMsg);
      return {
        success: false,
        error: errMsg,
        raw: data
      };
    }
  } catch (err) {
    console.error('iCredit network/service exception:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Verifies an iCredit transaction using PrivateSaleToken
 */
async function verifyICreditSale({ privateSaleToken }) {
  const token = process.env.ICREDIT_GROUP_PRIVATE_TOKEN || process.env.ICREDIT_API_KEY;
  if (!token || !privateSaleToken) return { verified: false };

  const endpoint = `${getICreditBaseUrl()}/Verify`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        GroupPrivateToken: token.trim(),
        PrivateSaleToken: privateSaleToken
      })
    });

    const data = await response.json();
    return {
      verified: data && data.Status === 0,
      data
    };
  } catch (err) {
    console.error('iCredit Verify error:', err);
    return { verified: false, error: err.message };
  }
}

module.exports = {
  createICreditPaymentSession,
  verifyICreditSale,
};
