// storage.js — Carrinho no localStorage (com remove/qty/total)

const CART_KEY = "fruttz_cart_v2";

window.Storage = {
  getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  },

  setCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items || []));
  },

  addToCart(item) {
    const cart = window.Storage.getCart();

    cart.push({
      id: crypto.randomUUID(),
      qty: 1,
      ...item,
      createdAt: Date.now()
    });

    window.Storage.setCart(cart);
    return cart;
  },

  removeItem(id) {
    const cart = window.Storage.getCart().filter((i) => i.id !== id);
    window.Storage.setCart(cart);
    return cart;
  },

  updateQty(id, qty) {
    const q = Math.max(1, Number(qty || 1));
    const cart = window.Storage.getCart().map((i) => (i.id === id ? { ...i, qty: q } : i));
    window.Storage.setCart(cart);
    return cart;
  },

  clearCart() {
    window.Storage.setCart([]);
  },

  cartTotal() {
    return window.Storage.getCart().reduce((acc, item) => {
      const unit = Number(item.total ?? item.basePrice ?? 0);
      const qty = Math.max(1, Number(item.qty || 1));
      return acc + unit * qty;
    }, 0);
  },

  cartCount() {
    return window.Storage.getCart().reduce((acc, i) => acc + Math.max(1, Number(i.qty || 1)), 0);
  },

  updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    if (!badge) return;

    const count = window.Storage.cartCount();
    badge.textContent = String(count);
    badge.classList.toggle("hidden", count === 0);
  }
};
