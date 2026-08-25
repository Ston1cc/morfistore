const CART_KEY = "morfi_cart";

// Cart only stores { [productId]: quantity }. Product details (name,
// price, image) are looked up from the in-memory product list fetched
// from Supabase on page load — the cart is never the source of truth
// for price, since that's re-validated server-side at checkout anyway.

export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addItem(cart, productId, qty = 1) {
  const next = { ...cart, [productId]: (cart[productId] || 0) + qty };
  saveCart(next);
  return next;
}

export function setQuantity(cart, productId, qty) {
  const next = { ...cart };
  if (qty <= 0) {
    delete next[productId];
  } else {
    next[productId] = qty;
  }
  saveCart(next);
  return next;
}

export function removeItem(cart, productId) {
  return setQuantity(cart, productId, 0);
}

export function clearCart() {
  saveCart({});
  return {};
}

export function getTotalCount(cart) {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

export function computeSubtotal(cart, productsById) {
  return Object.entries(cart).reduce((sum, [productId, qty]) => {
    const product = productsById[productId];
    return product ? sum + product.price * qty : sum;
  }, 0);
}
