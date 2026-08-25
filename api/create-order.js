const { supabaseAdmin } = require("./_lib/supabaseAdmin");
const { generateMiaPaymentLink } = require("./_lib/mia");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // req.body is a lazy getter in Vercel's dev server — it parses JSON on
  // first access and throws synchronously on malformed input. Uncaught,
  // that takes down the whole dev server process, not just the request.
  let body;
  try {
    body = req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { customerName, customerPhone, deliveryMethod, deliveryAddress, items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  // Only product id + quantity cross the wire from the client — price
  // is never trusted from here. create_order() re-reads price/stock
  // from the products table itself, inside one transaction.
  const rpcItems = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabaseAdmin.rpc("create_order", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_delivery_method: deliveryMethod,
    p_delivery_address: deliveryAddress || null,
    p_items: rpcItems,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { order_id: orderId, order_token: orderToken, total } = data;
  const payment = await generateMiaPaymentLink(orderId, total);

  return res.status(201).json({ orderToken, total, payment });
};
