import { formatPrice, escapeHtml } from "./format.js";
import { computeSubtotal, getTotalCount } from "./cart.js";

function cartRowHtml(productId, item) {
  const lineTotal = item.price * item.quantity;
  return `
    <div class="flex gap-3 items-center">
      <img src="${escapeHtml(item.image)}" class="w-16 h-16 rounded-lg object-cover shrink-0" alt="${escapeHtml(item.name)}">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm text-slate-800 truncate">${escapeHtml(item.name)}</div>
        <div class="text-slate-500 text-xs">${formatPrice(item.price)}</div>
        <div class="flex items-center gap-2 mt-1.5">
          <button class="qty-decr w-6 h-6 rounded-full border border-slate-200 text-slate-600 leading-none" data-product-id="${productId}" aria-label="Scade cantitatea">−</button>
          <span class="text-sm w-5 text-center">${item.quantity}</span>
          <button class="qty-incr w-6 h-6 rounded-full border border-slate-200 text-slate-600 leading-none" data-product-id="${productId}" aria-label="Crește cantitatea">+</button>
          <button class="remove-item text-slate-400 hover:text-red-500 ml-2 text-xs" data-product-id="${productId}">Elimină</button>
        </div>
      </div>
      <div class="font-bold text-slate-800 text-sm shrink-0">${formatPrice(lineTotal)}</div>
    </div>
  `;
}

export function renderCart(cart) {
  const itemsContainer = document.getElementById("cart-items");
  const entries = Object.entries(cart);

  itemsContainer.innerHTML = entries.length
    ? entries.map(([id, item]) => cartRowHtml(id, item)).join("")
    : `<p class="text-slate-500 text-center py-8">Coșul tău e gol.</p>`;

  const subtotal = computeSubtotal(cart);
  const count = getTotalCount(cart);

  document.querySelectorAll(".cart-subtotal").forEach((el) => (el.textContent = formatPrice(subtotal)));
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = count));

  const checkoutBtn = document.getElementById("cart-checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.classList.toggle("pointer-events-none", entries.length === 0);
    checkoutBtn.classList.toggle("opacity-50", entries.length === 0);
  }
}

export function openCart() {
  document.getElementById("cart-drawer").classList.remove("translate-x-full");
  document.getElementById("cart-backdrop").classList.remove("hidden");
}

export function closeCart() {
  document.getElementById("cart-drawer").classList.add("translate-x-full");
  document.getElementById("cart-backdrop").classList.add("hidden");
}
