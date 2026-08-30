import { cartToText, clearCart } from "./cart.js";
import { formatPrice, escapeHtml } from "./format.js";

function summaryRowHtml(productId, item) {
  return `
    <div class="flex items-center gap-3 py-2.5">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 bg-white">
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-slate-800 truncate">${escapeHtml(item.name)}</div>
        <div class="flex items-center gap-2 mt-1">
          <button type="button" class="qty-decr w-6 h-6 rounded-full border border-slate-300 text-slate-600 leading-none shrink-0" data-product-id="${productId}" aria-label="Scade cantitatea">−</button>
          <span class="text-sm w-4 text-center">${item.quantity}</span>
          <button type="button" class="qty-incr w-6 h-6 rounded-full border border-slate-300 text-slate-600 leading-none shrink-0" data-product-id="${productId}" aria-label="Crește cantitatea">+</button>
          <button type="button" class="remove-item text-red-400 hover:text-red-600 ml-1" data-product-id="${productId}" aria-label="Elimină ${escapeHtml(item.name)}">
            <svg class="w-4 h-4 icon-o" viewBox="0 0 24 24" stroke-width="2"><use href="#i-trash"/></svg>
          </button>
        </div>
      </div>
      <div class="text-sm font-semibold text-slate-800 shrink-0">${formatPrice(item.price * item.quantity)}</div>
    </div>
  `;
}

export function updateCartSummaryField(cart) {
  // Hidden field carries the plain-text version — that's what actually
  // reaches the owner's inbox via Web3Forms. The visual list below it
  // is just for the person filling out the form.
  const hiddenField = document.getElementById("cart-summary-field");
  if (hiddenField) hiddenField.value = cartToText(cart);

  const visual = document.getElementById("cart-summary-visual");
  if (!visual) return;

  const entries = Object.entries(cart);
  visual.innerHTML = entries.length
    ? entries.map(([id, item]) => summaryRowHtml(id, item)).join("")
    : `<p class="text-sm text-slate-400 text-center py-6">Coșul tău e gol.</p>`;
}

function showFormMessage(text, isError) {
  const el = document.getElementById("contact-form-message");
  el.textContent = text;
  el.classList.remove("hidden", "text-red-600", "text-green-600");
  el.classList.add(isError ? "text-red-600" : "text-green-600");
}

export function initContactForm(onSubmitted) {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("contact-form-submit");
    submitBtn.disabled = true;

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Comanda nu a putut fi trimisă.");
      }

      showFormMessage("Mulțumim! Comanda ta a fost trimisă.", false);
      form.reset();
      clearCart();
      onSubmitted?.();
    } catch (err) {
      showFormMessage(err.message || "A apărut o eroare. Încearcă din nou.", true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
