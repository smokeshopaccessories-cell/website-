export function getCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
export function saveCart(c) {
  localStorage.setItem('cart', JSON.stringify(c))
  window.dispatchEvent(new Event('cart'))
}
export function addToCart(p) {
  const c = getCart()
  const i = c.find((x) => x.id === p.id)
  if (i) i.qty += 1
  else c.push({ id: p.id, name: p.name, qty: 1, price: p.price })
  saveCart(c)
}
export const money = (v) => (v == null ? '' : '$' + Number(v).toFixed(2))
