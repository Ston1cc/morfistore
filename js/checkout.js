import { fetchActiveProducts } from "./products.js";
import { loadCart, clearCart } from "./cart.js";
import { formatPrice, escapeHtml } from "./format.js";

function productImage(product) {
  const first = Array.isArray(product.images) ? product.images[0] : null;
  return first || "img/step_keychain.png";
}

function renderSummary(cart, productsById) {
  const itemsContainer = document.getElementById("order-summary-items");
  const entries = Object.entries(cart).filter(([id]) => productsById[id]);

  itemsContainer.innerHTML = entries
    .map(([id, qty]) => {
      const product = productsById[id];
      return `
        <div class="flex gap-3 items-center">
          <img src="${escapeHtml(productImage(product))}" class="w-12 h-12 rounded-lg object-cover shrink-0" alt="${escapeHtml(product.name)}">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-slate-800 truncate">${escapeHtml(product.name)}</div>
            <div class="text-xs text-slate-500">${qty} × ${formatPrice(product.price)}</div>
          </div>
          <div class="text-sm font-bold text-slate-800 shrink-0">${formatPrice(product.price * qty)}</div>
        </div>
      `;
    })
    .join("");

  const subtotal = entries.reduce((sum, [id, qty]) => sum + productsById[id].price * qty, 0);
  document.getElementById("order-summary-subtotal").textContent = formatPrice(subtotal);

  return entries;
}

function toggleAddressRequirement() {
  const method = document.getElementById("delivery-method").value;
  const addressInput = document.getElementById("delivery-address");
  addressInput.required = method === "curier";
}

function showError(message) {
  const el = document.getElementById("checkout-error");
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError() {
  document.getElementById("checkout-error").classList.add("hidden");
}

async function init() {
  const cart = loadCart();
  const cartEntryCount = Object.keys(cart).length;

  if (cartEntryCount === 0) {
    document.getElementById("checkout-empty").classList.remove("hidden");
    document.getElementById("checkout-form").classList.add("hidden");
    return;
  }

  const products = await fetchActiveProducts();
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));
  const entries = renderSummary(cart, productsById);

  if (entries.length === 0) {
    document.getElementById("checkout-empty").classList.remove("hidden");
    document.getElementById("checkout-form").classList.add("hidden");
    return;
  }

  document.getElementById("delivery-method").addEventListener("change", toggleAddressRequirement);
  toggleAddressRequirement();

  document.getElementById("checkout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const submitBtn = document.getElementById("checkout-submit");
    submitBtn.disabled = true;

    const form = e.target;
    const payload = {
      customerName: form.customerName.value.trim(),
      customerPhone: form.customerPhone.value.trim(),
      deliveryMethod: form.deliveryMethod.value,
      deliveryAddress: form.deliveryAddress.value.trim(),
      items: entries.map(([productId, quantity]) => ({ productId, quantity })),
    };

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Comanda nu a putut fi plasată.");
      }

      clearCart();
      window.location.href = `comanda.html?token=${encodeURIComponent(data.orderToken)}`;
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
