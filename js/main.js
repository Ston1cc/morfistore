import { fetchActiveProducts, renderProductsGrid } from "./products.js";
import { loadCart, addItem, setQuantity, removeItem } from "./cart.js";
import { renderCart, openCart, closeCart } from "./cartUi.js";

let cart = loadCart();
let productsById = {};

function refreshCart() {
  renderCart(cart, productsById);
}

async function init() {
  const products = await fetchActiveProducts();
  productsById = Object.fromEntries(products.map((p) => [p.id, p]));

  renderProductsGrid(document.getElementById("products-grid"), products);
  refreshCart();

  document.querySelectorAll(".cart-open-btn").forEach((btn) =>
    btn.addEventListener("click", openCart)
  );
  document.getElementById("cart-close-btn").addEventListener("click", closeCart);
  document.getElementById("cart-backdrop").addEventListener("click", closeCart);

  document.getElementById("products-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart-btn");
    if (!btn) return;
    cart = addItem(cart, btn.dataset.productId, 1);
    refreshCart();
    openCart();
  });

  document.getElementById("cart-items").addEventListener("click", (e) => {
    const productId =
      e.target.closest("[data-product-id]")?.dataset.productId;
    if (!productId) return;

    if (e.target.closest(".qty-incr")) {
      cart = setQuantity(cart, productId, (cart[productId] || 0) + 1);
    } else if (e.target.closest(".qty-decr")) {
      cart = setQuantity(cart, productId, (cart[productId] || 0) - 1);
    } else if (e.target.closest(".remove-item")) {
      cart = removeItem(cart, productId);
    } else {
      return;
    }
    refreshCart();
  });
}

document.addEventListener("DOMContentLoaded", init);
