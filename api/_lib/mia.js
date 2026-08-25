// Stub for MIA Instant Payments (Moldovan bank-mediated instant payment
// rail). Swap the body of this function for the real bank API call once
// those integration details exist — keep the returned shape
// (paymentLink + qrPayload) stable, since /api/create-order hands it
// straight to the frontend.
async function generateMiaPaymentLink(orderId, amount) {
  return {
    provider: "mia",
    stub: true,
    paymentLink: `https://mia.example.md/pay/${orderId}`,
    qrPayload: `MIA|order=${orderId}|amount=${Number(amount).toFixed(2)}|currency=MDL`,
  };
}

module.exports = { generateMiaPaymentLink };
