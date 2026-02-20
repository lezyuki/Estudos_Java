// success.js — Acompanhar pedido (Fruttz)
// ----------------------------------------------------
// ✅ Lê orderId da URL (?id=... ou ?orderId=...) ou do localStorage
// ✅ Busca pedido no backend (GET /api/orders/{id})
// ✅ Atualiza automaticamente (polling)
// ✅ Atualiza: Pedido / Status / Subtítulo / Timeline / Total / Endereço
// ✅ Botões: voltar / novo / atualizar agora
//
// 🔥 ALTERAÇÃO (PEDIDA):
// ❌ NÃO mostra Pix nessa página
// ❌ NÃO cria Pix (não chama /pix)
// ❌ NÃO exibe "copia e cola", nem botão copiar
// ❌ NÃO exibe botão DEV "simular pagamento" nessa tela
// ----------------------------------------------------

/* =========================================================
   CONFIG
   ========================================================= */
const API_BASE = "http://localhost:8080/api";
const POLL_MS = 30000; // intervalo de atualização automática (ms)
const STOP_ON_FINAL = true; // para polling quando status final (DELIVERED/CANCELED)

/**
 * 🔒 PIX NA TELA SUCCESS: DESLIGADO
 * - O checkout já tem modal Pix.
 * - Aqui é somente acompanhamento.
 */
const SHOW_PIX_ON_SUCCESS = false;

/* =========================================================
   HELPERS
   ========================================================= */
function $(id) {
  return document.getElementById(id);
}

function setText(id, txt) {
  const el = $(id);
  if (el) el.textContent = txt ?? "—";
}

function formatBRL(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* =========================================================
   Params / MODO ADM
   - se URL tiver ?from=admin, volta pra comanda e esconde ações de cliente
   ========================================================= */
function getParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

function isAdminMode() {
  return String(getParam("from") || "").toLowerCase() === "admin";
}

/**
 * Define destino correto do "Voltar".
 * - Cliente: volta pro cardápio
 * - Admin: volta pro painel (comanda)
 */
function getBackUrl() {
  return isAdminMode() ? "./comanda.html" : "./index.html";
}

/**
 * Ajusta UI quando vem do admin:
 * - troca texto do link superior
 * - troca texto do botão voltar
 * - esconde Pix (e qualquer ação de pagamento)
 */
function applyAdminModeUI() {
  if (!isAdminMode()) return;

  const topBack = document.querySelector(".link-mini");
  if (topBack) {
    topBack.textContent = "Voltar ao painel";
    topBack.setAttribute("href", "./comanda.html");
  }

  const btnBack = $("btnBack");
  if (btnBack) btnBack.textContent = "Voltar ao painel";

  // Pix sempre off aqui de qualquer forma
  setPixUIVisible(false);

  // Botão DEV também não faz sentido na tela de acompanhar
  const devBtn = $("btnSimPay");
  if (devBtn) devBtn.style.display = "none";
}

/* =========================================================
   Leitura de orderId
   ========================================================= */
function getOrderIdFromUrl() {
  return getParam("id") || getParam("orderId");
}

function getOrderId() {
  const fromUrl = getOrderIdFromUrl();
  if (fromUrl) return fromUrl;

  try {
    return localStorage.getItem("fruttz:last_order_id");
  } catch {
    return null;
  }
}

/* =========================================================
   Status UI
   ========================================================= */
function normalizeStatus(status) {
  return String(status || "").trim().toUpperCase() || "—";
}

function statusLabelPT(status) {
  const s = normalizeStatus(status);
  const map = {
    CREATED: "CRIADO",
    WAITING_PAYMENT: "AGUARDANDO",
    PAID: "PAGO",
    PREPARING: "EM PREPARO",
    OUT_FOR_DELIVERY: "EM ENTREGA",
    DELIVERED: "ENTREGUE",
    CANCELED: "CANCELADO",
  };
  return map[s] || s || "—";
}

function setStatusPill(status) {
  const pill = $("statusPill");
  if (!pill) return;

  const s = normalizeStatus(status);
  pill.textContent = statusLabelPT(s);

  pill.classList.remove("ok", "warn", "bad");

  if (s === "PAID" || s === "DELIVERED") pill.classList.add("ok");
  else if (s === "CREATED" || s === "WAITING_PAYMENT") pill.classList.add("warn");
  else if (s === "CANCELED") pill.classList.add("bad");
  else pill.classList.add("ok");
}

function setSubtitleByStatus(status) {
  const el = $("subtitle");
  if (!el) return;

  const s = normalizeStatus(status);
  const map = {
    CREATED: "Pedido criado.",
    WAITING_PAYMENT: "Aguardando confirmação do pagamento…",
    PAID: "Pagamento confirmado. Vamos iniciar o preparo em instantes.",
    PREPARING: "Seu pedido está em preparo.",
    OUT_FOR_DELIVERY: "Saiu para entrega. Já já chega!",
    DELIVERED: "Entregue. Bom apetite 😋",
    CANCELED: "Pedido cancelado.",
  };

  el.textContent = map[s] || "Atualizando status automaticamente…";
}

/* =========================================================
   Timeline
   ========================================================= */
function statusToStep(status) {
  const s = normalizeStatus(status);
  if (s === "CREATED" || s === "WAITING_PAYMENT") return 1;
  if (s === "PAID") return 2;
  if (s === "PREPARING") return 3;
  if (s === "OUT_FOR_DELIVERY") return 4;
  if (s === "DELIVERED") return 5;
  return 2;
}

let __lastStep = null;

function renderTimeline(status) {
  const anyStep = $("st1") || $("st2") || $("st3") || $("st4") || $("st5");
  if (!anyStep) return;

  const step = statusToStep(status);

  for (let i = 1; i <= 5; i++) {
    const el = $(`st${i}`);
    if (!el) continue;

    el.classList.remove("is-on", "is-done", "is-next", "pop");

    if (i === step) {
      el.classList.add("is-on");

      if (__lastStep !== null && __lastStep !== step) {
        el.classList.add("pop");
        setTimeout(() => el.classList.remove("pop"), 260);
      }
    }

    if (i === step + 1) el.classList.add("is-next");
  }

  __lastStep = step;
}

/* =========================================================
   API
   ========================================================= */
async function apiGetOrder(orderId) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Pedido não encontrado (${res.status}) ${txt}`);
  }

  return res.json();
}

/* =========================================================
   UI Pix (DESLIGADO)
   - Mantemos funções existentes para não quebrar HTML,
     mas sempre escondemos o bloco.
   ========================================================= */
function setPixUIVisible(visible) {
  const block = $("pixBlock");
  if (!block) return;

  // ✅ Pix desativado nessa tela
  if (!SHOW_PIX_ON_SUCCESS) {
    block.style.display = "none";
    return;
  }

  block.style.display = visible ? "" : "none";
}

function setPixCode(text) {
  // Mantido por compatibilidade, mas não usamos.
  const el = $("pixCode");
  if (!el) return;
  if ("value" in el) el.value = text || "";
  else el.textContent = text || "";
}

/* =========================================================
   Pedido (número REAL do backend)
   ========================================================= */
function getOrderDisplayNumber(order, fallbackId) {
  const n = order?.orderNumber;
  if (n != null && String(n).trim()) return String(n).trim();

  if (fallbackId != null && String(fallbackId).trim()) return String(fallbackId).trim();
  return "—";
}

/* =========================================================
   Render do pedido
   ========================================================= */
function renderOrder(order, fallbackOrderId) {
  const id = order?.id || fallbackOrderId || "—";
  const status = order?.status || "—";

  // Número real do backend (ou fallback)
  setText("orderId", getOrderDisplayNumber(order, id));

  // TXID: se existir no pedido, usa; se não, só mostra "—"
  const txid = order?.payment?.txid || order?.txid || "—";
  setText("txid", txid);

  setStatusPill(status);
  setSubtitleByStatus(status);
  renderTimeline(status);

  // Total
  const totalRow = $("kvTotalRow");
  const totalEl = $("total");
  const pricingTotal = order?.pricing?.total;

  if (totalRow && totalEl) {
    if (pricingTotal != null) {
      totalRow.style.display = "";
      totalEl.textContent = formatBRL(pricingTotal);
    } else {
      totalRow.style.display = "none";
    }
  }

  // Endereço
  const addrRow = $("kvAddrRow");
  const addrEl = $("addr");
  const d = order?.delivery;

  if (addrRow && addrEl) {
    if (d?.addressLine) {
      addrRow.style.display = "";
      const number = (d.number && String(d.number).trim()) ? String(d.number).trim() : "s/n";
      addrEl.textContent = `${d.addressLine}, ${number}`;
    } else {
      addrRow.style.display = "none";
    }
  }

  // ✅ Pix sempre OFF nessa página
  setPixUIVisible(false);
  setPixCode("");

  // Persistir last_order_id (útil pro botão acompanhar no index)
  try {
    localStorage.setItem("fruttz:last_order_id", String(id));
  } catch {}

  // parar polling em final
  const s = normalizeStatus(status);
  if (STOP_ON_FINAL && (s === "DELIVERED" || s === "CANCELED")) return true;

  return false;
}

/* =========================================================
   Load + Polling
   ========================================================= */
let __poll = null;
let __currentOrderId = null;

function stopPolling() {
  if (__poll) {
    clearInterval(__poll);
    __poll = null;
  }
}

async function loadOnce() {
  const orderId = getOrderId();
  __currentOrderId = orderId;

  if (!orderId) {
    setStatusPill("—");
    setText("orderId", "—");
    setText("txid", "—");
    setSubtitleByStatus("—");
    renderTimeline("—");

    // Pix off
    setPixUIVisible(false);
    setPixCode("");
    return true;
  }

  // placeholder rápido
  setText("orderId", String(orderId));
  setText("txid", "—");

  // Pix off
  setPixUIVisible(false);
  setPixCode("");

  const order = await apiGetOrder(orderId);
  const shouldStop = renderOrder(order, orderId);
  return shouldStop;
}

function startPolling() {
  stopPolling();
  __poll = setInterval(async () => {
    try {
      const stop = await loadOnce();
      if (stop) stopPolling();
    } catch (e) {
      console.warn("[success] poll error:", e?.message || e);
    }
  }, POLL_MS);
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  applyAdminModeUI();

  $("btnBack")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = getBackUrl();
  });

  $("btnNew")?.addEventListener?.("click", (e) => {
    e.preventDefault();
    window.location.href = getBackUrl();
  });

  $("btnRefresh")?.addEventListener("click", async () => {
    try {
      await loadOnce();
    } catch (e) {
      console.error(e);
    }
  });

  // Pix sempre off nessa página
  setPixUIVisible(false);
  setPixCode("");

  try {
    const stop = await loadOnce();
    if (!stop) startPolling();
  } catch (err) {
    console.error(err);

    const orderId = getOrderId();
    setStatusPill("—");
    setText("orderId", orderId ? String(orderId) : "—");
    setText("txid", "—");
    setSubtitleByStatus("—");
    renderTimeline("—");

    // Pix off
    setPixUIVisible(false);
    setPixCode("");

    startPolling();
  }
});
