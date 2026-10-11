export function getCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
export function saveCart(c) {
  localStorage.setItem('cart', JSON.stringify(c))
  window.dispatchEvent(new Event('cart'))
}
export function addToCart(p, qty = 1) {
  const n = Math.max(1, Math.min(999, parseInt(qty) || 1))
  const c = getCart()
  const i = c.find((x) => x.id === p.id)
  if (i) i.qty = Math.min(999, i.qty + n)
  else c.push({ id: p.id, name: p.name, qty: n, price: p.price })
  saveCart(c)
}
export const money = (v) => (v == null ? '' : '$' + Number(v).toFixed(2))
