// follow-order.js — CTA "Acompanhar pedido" no index.html
(function () {
  function $(id) { return document.getElementById(id); }

  function getLastOrderId() {
    try { return localStorage.getItem("fruttz:last_order_id"); }
    catch { return null; }
  }

  function isHiddenByUser() {
    try { return localStorage.getItem("fruttz:hide_follow_cta") === "1"; }
    catch { return false; }
  }

  function hideByUser() {
    try { localStorage.setItem("fruttz:hide_follow_cta", "1"); } catch {}
  }

  function showCta(orderId) {
    const wrap = $("followOrderCta");
    const btn = $("btnFollowOrder");
    const x = $("btnHideFollowOrder");
    const sub = $("followOrderSub");

    if (!wrap || !btn) return;

    if (sub) sub.textContent = `Pedido: ${orderId.slice(0, 8).toUpperCase()} • acompanhar status`;

    wrap.classList.remove("hidden");

    btn.onclick = () => {
      window.location.href = `./success.html?id=${encodeURIComponent(orderId)}`;
    };

    x && (x.onclick = () => {
      hideByUser();
      wrap.classList.add("hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const orderId = getLastOrderId();

    // se não tem pedido, não mostra
    if (!orderId) return;

    // se usuário fechou antes, não mostra
    if (isHiddenByUser()) return;

    showCta(orderId);
  });
})();
