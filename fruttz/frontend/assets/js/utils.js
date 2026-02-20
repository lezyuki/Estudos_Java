window.Utils = {
  normalizeText(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  },


  formatBRL(n) {
    const v = Number(n || 0);
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  },

  showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
  }
};
