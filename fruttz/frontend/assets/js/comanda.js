// comanda.js — Painel da Loja (Fruttz)
// -------------------------------------------------------------
// ✅ Lista pedidos (GET /api/orders)
// ✅ Filtro por status
// ✅ Polling (atualiza automaticamente)
// ✅ Expandir detalhes (GET /api/orders/{id})
// ✅ Avançar status (POST /api/orders/{id}/status)
// ✅ SEM HTML inline: usa templates centralizados em ui-templates.js (window.TPL)
// ✅ FIX DEFINITIVO: "Entrega" aparece mesmo quando /orders não retorna delivery
//    -> buscamos /orders/{id} quando faltar NOME ou TELEFONE ou ENDEREÇO.
// -------------------------------------------------------------

const API_BASE = "http://localhost:8080/api";
const POLL_MS = 2000;

const STATUS_FLOW = [
  "CREATED",
  "WAITING_PAYMENT",
  "PAID",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

function $(id) {
  return document.getElementById(id);
}

/* =========================================================
   STATUS helpers
   ========================================================= */
function normalizeStatus(s) {
  return String(s || "").trim().toUpperCase() || "CREATED";
}

function statusLabelPT(status) {
  const s = normalizeStatus(status);
  const map = {
    CREATED: "CRIADO",
    WAITING_PAYMENT: "AGUARDANDO PAGAMENTO",
    PAID: "PAGO",
    PREPARING: "EM PREPARO",
    OUT_FOR_DELIVERY: "EM ENTREGA",
    DELIVERED: "ENTREGUE",
    CANCELED: "CANCELADO",
  };
  return map[s] || s;
}

function pillClass(status) {
  const s = normalizeStatus(status);
  if (s === "CREATED" || s === "WAITING_PAYMENT") return "warn";
  if (s === "CANCELED") return "bad";
  return "ok";
}

/* =========================================================
   Formatting helpers
   ========================================================= */
function formatBRL(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function safeText(v, fallback = "—") {
  const t = String(v ?? "").trim();
  return t ? t : fallback;
}

function pickFirst(...vals) {
  for (const v of vals) {
    const t = String(v ?? "").trim();
    if (t) return t;
  }
  return "";
}

/* =========================================================
   Address / Customer extractors
   ========================================================= */
function buildAddressLine(order) {
  const d = order?.delivery || order?.address || {};

  const line = pickFirst(d.addressLine, d.street, d.logradouro, d.rua);
  if (!line) return "";

  const num = pickFirst(d.number, d.numero);
  const bairro = pickFirst(d.neighborhood, d.bairro);

  const parts = [];
  parts.push(line + (num ? `, ${num}` : ""));
  if (bairro) parts.push(bairro);

  return parts.join(" • ");
}

function extractCustomerInfo(order) {
  const o = order || {};
  const c = o.customer || o.client || o.buyer || {};

  const name = pickFirst(
    c.name,
    c.fullName,
    c.nome,
    o.customerName,
    o.clientName,
    o.name,
    o.nome,
    o.delivery?.name,
    o.delivery?.receiverName
  );

  const phone = pickFirst(
    c.phone,
    c.mobile,
    c.whatsapp,
    c.telefone,
    o.customerPhone,
    o.clientPhone,
    o.phone,
    o.telefone,
    o.delivery?.phone,
    o.delivery?.receiverPhone
  );

  return { name, phone };
}

/* =========================================================
   API
   ========================================================= */
async function apiGetOrders() {
  const res = await fetch(`${API_BASE}/orders`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /orders falhou (${res.status})`);
  return res.json();
}

async function apiGetOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /orders/{id} falhou (${res.status})`);
  return res.json();
}

async function apiSetStatus(id, status) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao atualizar status (${res.status}) ${txt}`);
  }
  return res.json();
}

/* =========================================================
   State
   ========================================================= */
function nextStatus(current) {
  const s = normalizeStatus(current);
  const idx = STATUS_FLOW.indexOf(s);
  if (idx < 0) return "WAITING_PAYMENT";
  return STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
}

let __filter = "ALL";
let __poll = null;
let __lastUpdatedAt = 0;
let __lastOrders = [];

const detailsCache = new Map(); // id -> orderDetail
const openDetails = new Set();  // ids abertos

/* =========================================================
   Filter + meta
   ========================================================= */
function setFilter(filter) {
  __filter = filter;
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.filter === filter);
  });
  renderCurrent();
}

function computeCounts(orders) {
  const counts = { ALL: orders.length };
  for (const o of orders) {
    const s = normalizeStatus(o.status);
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

function selectOrdersForView() {
  if (__filter === "ALL") return __lastOrders;
  return __lastOrders.filter((o) => normalizeStatus(o.status) === __filter);
}

function renderMeta() {
  const counts = computeCounts(__lastOrders);
  const parts = [
    `Todos: ${counts.ALL || 0}`,
    `Criado: ${counts.CREATED || 0}`,
    `Aguardando: ${counts.WAITING_PAYMENT || 0}`,
    `Pago: ${counts.PAID || 0}`,
    `Preparo: ${counts.PREPARING || 0}`,
    `Entrega: ${counts.OUT_FOR_DELIVERY || 0}`,
    `Entregue: ${counts.DELIVERED || 0}`,
  ];

  $("metaCounts").textContent = parts.join(" • ");

  const d = new Date(__lastUpdatedAt || Date.now());
  $("metaLast").textContent = `Última atualização: ${d.toLocaleTimeString("pt-BR")}`;
}

/* =========================================================
   Card renderer (usa window.TPL)
   ========================================================= */
function cardHTML(o) {
  const id = String(o?.id || "");
  const status = normalizeStatus(o?.status);
  const pill = pillClass(status);

  const subtotal = o?.pricing?.subtotal ?? null;
  const shipping = o?.pricing?.shipping ?? null;
  const total = o?.pricing?.total ?? null;

  const orderNumber = safeText(o?.prettyOrder || o?.orderNumber || "");
  const title = orderNumber ? `Pedido ${orderNumber}` : `Pedido ${id}`;

  const { name: customerName, phone: customerPhone } = extractCustomerInfo(o);
  const sub1 = `Cliente: ${safeText(customerName)}`;
  const sub2 = `Telefone: ${safeText(customerPhone)}`;

  const addr = buildAddressLine(o);
  const sub3 = `Entrega: ${addr ? addr : "—"}`;

  const canAdvance = status !== "DELIVERED" && status !== "CANCELED";
  const next = nextStatus(status);
  const isOpen = openDetails.has(id);

  return window.TPL.comandaOrderCard({
    id,
    title,
    sub1,
    sub2,
    sub3,
    pillClass: pill,
    statusLabel: statusLabelPT(status),

    totalText: total != null ? formatBRL(total) : "—",
    shippingText: shipping != null ? formatBRL(shipping) : "—",
    subtotalText: subtotal != null ? formatBRL(subtotal) : "—",
    statusText: statusLabelPT(status),

    isOpen,
    canAdvance,
    nextLabel: statusLabelPT(next),
  });
}

/* =========================================================
   Render
   ========================================================= */
function renderCurrent() {
  const list = $("ordersList");
  const empty = $("emptyState");
  const view = selectOrdersForView();

  renderMeta();

  if (!view.length) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  list.innerHTML = view.map(cardHTML).join("");

  list.querySelectorAll(".order-card").forEach((card) => {
    const id = card.dataset.id;
    card.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => onCardAction(id, btn.dataset.action));
    });
  });

  openDetails.forEach((id) => {
    const details = $(`details-${id}`);
    if (!details) return;

    details.classList.add("is-on");

    const itemsWrap = $(`items-${id}`);
    if (!itemsWrap) return;

    if (detailsCache.has(id)) {
      renderItems(detailsCache.get(id), itemsWrap);
    } else {
      loadDetailsInto(id);
    }
  });
}

/* =========================================================
   Details
   ========================================================= */
async function loadDetailsInto(id) {
  const itemsWrap = $(`items-${id}`);
  if (!itemsWrap) return;

  if (detailsCache.has(id)) {
    renderItems(detailsCache.get(id), itemsWrap);
    return;
  }

  try {
    const detail = await apiGetOrder(id);
    detailsCache.set(id, detail);
    renderItems(detail, itemsWrap);
  } catch (e) {
    itemsWrap.innerHTML = window.TPL.comandaItemsError(safeText(e?.message));
  }
}

function renderItems(orderDetail, itemsWrap) {
  const items = orderDetail?.items || [];
  if (!items.length) {
    itemsWrap.innerHTML = window.TPL.comandaItemsEmpty();
    return;
  }

  function normalizeAddons(addons) {
    if (!addons) return [];

    if (typeof addons === "string") {
      const s = addons.trim();
      if (!s) return [];
      try {
        return normalizeAddons(JSON.parse(s));
      } catch {
        return [s];
      }
    }

    if (Array.isArray(addons)) {
      if (!addons.length) return [];
      if (typeof addons[0] === "object" && addons[0] !== null) {
        return addons.map((a) => String(a.label ?? a.name ?? a.key ?? "Adicional"));
      }
      if (typeof addons[0] === "string") {
        return addons.map((s) => String(s));
      }
    }

    if (typeof addons === "object") {
      if (addons.label || addons.name || addons.key) {
        return [String(addons.label ?? addons.name ?? addons.key ?? "Adicional")];
      }
      return [JSON.stringify(addons)];
    }

    return [];
  }

  const itemsHtml = items
    .map((it) => {
      const name = safeText(it.name);
      const qty = Number(it.quantity || 1);
      const lineTotal = it.total ?? null;

      const labels = normalizeAddons(it.addons);
      const addonsHtml = window.TPL.comandaAddonsChips(labels);

      return window.TPL.comandaOrderItem({
        title: `${qty}× ${name}`,
        subtotalText: lineTotal != null ? formatBRL(lineTotal) : "—",
        addonsHtml,
      });
    })
    .join("");

  const shipping = orderDetail?.pricing?.shipping ?? null;
  const total = orderDetail?.pricing?.total ?? null;

  itemsWrap.innerHTML = window.TPL.comandaItemsWrapper({
    itemsHtml,
    shippingText: shipping != null ? formatBRL(shipping) : "—",
    totalText: total != null ? formatBRL(total) : "—",
  });
}

/* =========================================================
   ✅ FIX PRINCIPAL: hidrata se faltar QUALQUER campo importante
   - /orders às vezes vem sem delivery (endereço)
   - aqui buscamos /orders/{id} quando:
     - não tem nome OU
     - não tem telefone OU
     - não tem endereço (Entrega)
   ========================================================= */
async function hydrateOrdersIfMissing(arr) {
  const needs = arr.filter((o) => {
    const info = extractCustomerInfo(o);
    const hasName = !!String(info.name || "").trim();
    const hasPhone = !!String(info.phone || "").trim();
    const hasAddr = !!buildAddressLine(o);

    // ✅ se faltar qualquer um => precisa hidratar
    return !hasName || !hasPhone || !hasAddr;
  });

  if (!needs.length) return arr;

  const details = await Promise.allSettled(needs.map((o) => apiGetOrder(o.id)));

  const byId = new Map();
  details.forEach((r) => {
    if (r.status === "fulfilled" && r.value?.id) byId.set(String(r.value.id), r.value);
  });

  return arr.map((o) => {
    const d = byId.get(String(o.id));
    if (!d) return o;

    // Mescla campos "completos" do detalhe por cima
    const merged = {
      ...o,
      customer: d.customer || o.customer,
      delivery: d.delivery || o.delivery,
      address: d.address || o.address,
      pricing: d.pricing || o.pricing,
      prettyOrder: o.prettyOrder || d.prettyOrder,
      orderNumber: o.orderNumber || d.orderNumber,
    };

    // Cacheia o detalhe completo também
    detailsCache.set(String(o.id), d);

    return merged;
  });
}

/* =========================================================
   Actions
   ========================================================= */
async function onCardAction(id, action) {
  if (action === "open") {
    window.location.href = `success.html?id=${encodeURIComponent(id)}&from=admin`;
    return;
  }

  if (action === "toggle") {
    const details = $(`details-${id}`);
    if (!details) return;

    const isOn = details.classList.toggle("is-on");

    if (isOn) {
      openDetails.add(id);
      await loadDetailsInto(id);
    } else {
      openDetails.delete(id);
    }

    renderCurrent();
    return;
  }

  if (action === "advance") {
    const o = __lastOrders.find((x) => String(x.id) === String(id));
    const cur = normalizeStatus(o?.status);
    const nxt = nextStatus(cur);

    try {
      if (o) o.status = nxt;
      renderCurrent();

      await apiSetStatus(id, nxt);

      detailsCache.delete(id);

      await refresh();

      if (openDetails.has(id)) {
        await loadDetailsInto(id);
      }
    } catch (e) {
      if (o) o.status = cur;
      renderCurrent();
      alert(e?.message || "Falha ao atualizar status");
    }
  }
}

/* =========================================================
   Refresh + Polling
   ========================================================= */
async function refresh() {
  const data = await apiGetOrders();
  const arr0 = Array.isArray(data) ? data : [];

  arr0.sort((a, b) => String(b.orderNumber || "").localeCompare(String(a.orderNumber || "")));

  // ✅ hidrata nome/telefone/endereço se precisar
  const arr = await hydrateOrdersIfMissing(arr0);

  __lastOrders = arr;
  __lastUpdatedAt = Date.now();

  renderCurrent();
}

function startPolling() {
  if (__poll) clearInterval(__poll);
  __poll = setInterval(async () => {
    try {
      await refresh();
    } catch (e) {
      console.warn("[comanda] poll", e?.message || e);
    }
  }, POLL_MS);
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.TPL || typeof window.TPL.comandaOrderCard !== "function") {
    console.error("[comanda] window.TPL não encontrado. Verifique a ordem dos imports no comanda.html");
    const sub = $("subtitle");
    if (sub) sub.textContent = "Erro: ui-templates.js não carregou (import deve vir antes do comanda.js).";
    return;
  }

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  $("btnRefresh")?.addEventListener("click", async () => {
    try {
      await refresh();
    } catch (e) {
      alert(e?.message || "Erro ao atualizar");
    }
  });

  $("btnOpenKitchen")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  try {
    await refresh();
    startPolling();
  } catch (e) {
    console.error(e);
    const sub = $("subtitle");
    if (sub) sub.textContent = "Não consegui carregar pedidos. Verifique o backend.";
  }
});
