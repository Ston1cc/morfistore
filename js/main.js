import { loadCart, addItem, setQuantity, removeItem } from "./cart.js";
import { renderCart, openCart, closeCart } from "./cartUi.js";
import { initContactForm, updateCartSummaryField } from "./contactForm.js";

let cart = loadCart();

function refreshCart() {
  renderCart(cart);
  updateCartSummaryField(cart);
}

function init() {
  refreshCart();

  document.getElementById("cart-open-btn").addEventListener("click", openCart);
  document.getElementById("cart-close-btn").addEventListener("click", closeCart);
  document.getElementById("cart-backdrop").addEventListener("click", closeCart);
  document.getElementById("cart-checkout-btn").addEventListener("click", closeCart);

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart-btn");
    if (!btn) return;
    cart = addItem(cart, {
      id: btn.dataset.productId,
      name: btn.dataset.productName,
      price: parseFloat(btn.dataset.productPrice),
      image: btn.dataset.productImage,
    });
    refreshCart();
    openCart();
  });

  function handleQtyClick(e) {
    const productId = e.target.closest("[data-product-id]")?.dataset.productId;
    if (!productId) return;

    if (e.target.closest(".qty-incr")) {
      cart = setQuantity(cart, productId, (cart[productId]?.quantity || 0) + 1);
    } else if (e.target.closest(".qty-decr")) {
      cart = setQuantity(cart, productId, (cart[productId]?.quantity || 0) - 1);
    } else if (e.target.closest(".remove-item")) {
      cart = removeItem(cart, productId);
    } else {
      return;
    }
    refreshCart();
  }

  document.getElementById("cart-items")?.addEventListener("click", handleQtyClick);
  document.getElementById("cart-summary-visual")?.addEventListener("click", handleQtyClick);

  initContactForm(() => {
    cart = loadCart();
    refreshCart();
  });

  initScrollReveal();
}

function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  targets.forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", init);
