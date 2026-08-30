import { cartToText, clearCart } from "./cart.js";

export function updateCartSummaryField(cart) {
  const field = document.getElementById("cart-summary-field");
  if (field) field.value = cartToText(cart);
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
