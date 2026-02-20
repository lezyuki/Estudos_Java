// cart.js — Carrinho (render, qty, remove, limpar, total + CTA checkout)

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBRL(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function labelSucoPrep(v) {
  if (v === "leite") return "com leite integral";
  return "com água";
}

function labelSucoSugar(v) {
  if (v === "com_acucar") return "com açúcar";
  return "sem açúcar";
}

function labelSize(item) {
  if (!item?.size) return "";
  if (item.category === "ACAI") return `${item.size}g`;
  if (item.category === "SALADA") return `${item.size}g`;
  if (item.category === "SUCO") return `${item.size}ml`;
  return String(item.size);
}

function formatOptions(item) {
  const parts = [];

  const s = labelSize(item);
  if (s) parts.push(s);

  if (item.category === "SUCO") {
    parts.push(labelSucoPrep(item.sucoPrep));
    parts.push(labelSucoSugar(item.sucoSugar));
  }

  if (item.category === "ACAI") {
    const addons = Array.isArray(item.addons) ? item.addons : [];
    if (addons.length) parts.push(`adicionais: ${addons.join(", ")}`);
  }

  if (item.category === "SALADA") {
    const addons = Array.isArray(item.addons) ? item.addons : [];
    if (addons.length) parts.push(`adicionais: ${addons.map(a => a?.label || a?.key || a).join(", ")}`);
  }

  return parts.filter(Boolean).join(" • ");
}

function hasAnyAddons(item) {
  const addons = Array.isArray(item.addons) ? item.addons : [];
  return addons.length > 0;
}

// ======= Render =======
function renderCart() {
  const listEl = document.getElementById("cartList");
  const emptyEl = document.getElementById("cartEmpty");
  const totalEl = document.getElementById("cartTotal");
  const clearBtn = document.getElementById("btnClearCart");
  const btnCheckout = document.getElementById("btnCheckout");

  if (!listEl || !emptyEl || !totalEl) return;

  const cart = window.Storage.getCart();

  emptyEl.classList.toggle("hidden", cart.length !== 0);
  listEl.classList.toggle("hidden", cart.length === 0);

  if (clearBtn) clearBtn.disabled = cart.length === 0;

  if (btnCheckout) {
    const hasItems = cart.length > 0;
    btnCheckout.classList.toggle("is-disabled", !hasItems);
  }

  if (cart.length === 0) {
    listEl.innerHTML = "";
    totalEl.textContent = formatBRL(0);
    window.Storage.updateCartBadge();
    return;
  }

  listEl.innerHTML = cart
    .map((item) => {
      const unit = Number(item.total ?? item.basePrice ?? 0);
      const qty = Math.max(1, Number(item.qty || 1));
      const line = unit * qty;

      // ✅ linha “Adicionais a partir de R$ 2,50” quando houver adicionais (açaí ou salada)
      const showAddonsHint = (item.category === "ACAI" || item.category === "SALADA") && hasAnyAddons(item);

      const hintText =
        item.category === "ACAI"
          ? `Adicionais a partir de ${formatBRL(window.FRUTTZ_CONFIG.addons.acaiPrice)}`
          : `Adicionais a partir de ${formatBRL(window.FRUTTZ_CONFIG.addons.salada.normal)}`;

      return window.TPL.cartItem({
  id: item.id,
  name: item.name || "Item",
  optionsText: formatOptions(item),
  showAddonsHint,
  hintText,
  unitText: formatBRL(unit),
  lineText: formatBRL(line),
  qty,
});
})
    .join("");

  // remover
  listEl.querySelectorAll(".js-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      window.Storage.removeItem(id);
      window.Storage.updateCartBadge();
      renderCart();
    });
  });

  // minus
  listEl.querySelectorAll(".js-qty-minus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;

      const cartNow = window.Storage.getCart();
      const item = cartNow.find((i) => i.id === id);
      if (!item) return;

      const next = Math.max(1, Number(item.qty || 1) - 1);
      window.Storage.updateQty(id, next);
      window.Storage.updateCartBadge();
      renderCart();
    });
  });

  // plus
  listEl.querySelectorAll(".js-qty-plus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;

      const cartNow = window.Storage.getCart();
      const item = cartNow.find((i) => i.id === id);
      if (!item) return;

      const next = Math.max(1, Number(item.qty || 1) + 1);
      window.Storage.updateQty(id, next);
      window.Storage.updateCartBadge();
      renderCart();
    });
  });

  // input
  listEl.querySelectorAll(".js-qty-input").forEach((inp) => {
    inp.addEventListener("change", () => {
      const id = inp.getAttribute("data-id");
      if (!id) return;
      const next = Math.max(1, Number(inp.value || 1));
      window.Storage.updateQty(id, next);
      window.Storage.updateCartBadge();
      renderCart();
    });

    inp.addEventListener("blur", () => {
      if (!inp.value) inp.value = "1";
    });
  });

  totalEl.textContent = formatBRL(window.Storage.cartTotal());
  window.Storage.updateCartBadge();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnClearCart")?.addEventListener("click", () => {
    window.Storage.clearCart();
    window.Storage.updateCartBadge();
    renderCart();
    // window.Utils?.showToast?.("Carrinho limpo ✅");
  });

  renderCart();
});
