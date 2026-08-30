export function formatPrice(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} lei`;
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
