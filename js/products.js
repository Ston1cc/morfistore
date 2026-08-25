import { supabase } from "./supabaseClient.js";
import { formatPrice, escapeHtml } from "./format.js";

export async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, images, stock")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load products:", error);
    return [];
  }
  return data;
}

function productImage(product) {
  const first = Array.isArray(product.images) ? product.images[0] : null;
  return first || "img/step_keychain.png"; // fallback placeholder
}

function productCardHtml(product) {
  const outOfStock = product.stock <= 0;
  return `
    <div>
      <div class="relative rounded-xl overflow-hidden aspect-square mb-3">
        <img src="${escapeHtml(productImage(product))}" class="w-full h-full object-cover" alt="${escapeHtml(product.name)}">
      </div>
      <div class="font-semibold text-sm text-slate-800">${escapeHtml(product.name)}</div>
      ${
        outOfStock
          ? `<div class="text-slate-400 text-sm font-semibold mt-1">Stoc epuizat</div>`
          : `<button
              class="add-to-cart-btn font-bold text-slate-800 hover:text-[#6b3fa0] transition-colors mt-1"
              data-product-id="${escapeHtml(product.id)}"
            >Adaugă în coș · ${formatPrice(product.price)}</button>`
      }
    </div>
  `;
}

export function renderProductsGrid(container, products) {
  if (!products.length) {
    container.innerHTML = `<p class="text-slate-500 col-span-full text-center py-8">Momentan nu sunt produse disponibile.</p>`;
    return;
  }
  container.innerHTML = products.map(productCardHtml).join("");
}
