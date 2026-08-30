const CART_KEY = "morfi_cart";

// This is an inquiry cart, not a real checkout — there's no product
// database to look prices up against, so each entry stores its own
// name/price/image snapshot straight from the page at add-time.

function isValidEntry(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.quantity === "number"
  );
}

export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Guards against stale data from an earlier cart schema (or any
    // other corruption) — drop anything that doesn't match the shape
    // this cart actually expects, rather than crashing the render.
    const clean = Object.fromEntries(
      Object.entries(parsed).filter(([, item]) => isValidEntry(item))
    );
    if (Object.keys(clean).length !== Object.keys(parsed).length) {
      saveCart(clean);
    }
    return clean;
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addItem(cart, product, qty = 1) {
  const existingQty = cart[product.id]?.quantity || 0;
  const next = {
    ...cart,
    [product.id]: {
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: existingQty + qty,
    },
  };
  saveCart(next);
  return next;
}

export function setQuantity(cart, productId, qty) {
  const next = { ...cart };
  if (qty <= 0) {
    delete next[productId];
  } else {
    next[productId] = { ...next[productId], quantity: qty };
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
  return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
}

export function computeSubtotal(cart) {
  return Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartToText(cart) {
  const entries = Object.values(cart);
  if (!entries.length) return "Fără produse selectate.";

  const lines = entries.map(
    (item) => `- ${item.name} x${item.quantity} — ${(item.price * item.quantity).toFixed(2)} lei`
  );
  return `${lines.join("\n")}\n\nTotal estimat: ${computeSubtotal(cart).toFixed(2)} lei`;
}
