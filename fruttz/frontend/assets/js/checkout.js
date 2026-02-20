// checkout.js — Checkout completo (CEP + Frete + Criar Pedido + Pix + Auto-Confirm)
// -------------------------------------------------------------
// ✅ ViaCEP preenche endereço
// ✅ Frete por tabela de bairros (sem mapa)
// ✅ Cria pedido no backend: POST /api/orders
// ✅ Gera Pix (mock por enquanto, mas fluxo real): POST /api/orders/{id}/pix
// ✅ Mostra modal Pix com "copia e cola" + botão copiar
// ✅ Modal com botões no estilo do app (verde clarinho / rosa clarinho)
// ✅ NOVO: Auto-confirm (polling) + botão DEV "Simular pagamento"
// ✅ INLINE SUCCESS: 2 botões, sem X, IDs nunca ficam tortos (wrap suave)
// ✅ NOVO: salva fruttz:last_order_id assim que cria pedido (pra aparecer botão no index)
// ✅ FIX: parse BRL seguro + cálculo de addons total consistente no payload
// ✅ FIX (AGORA): não confia em it.total do carrinho (evita bug 70 vs 18,99)
// ✅ FIX (AGORA): subtotal do checkout usa o mesmo cálculo do payload (unit + addons) * qty
// ✅ NOVO (VISUAL): Pedido bonitinho DD/MM/AAAA-FRUTTZ-001 no Pix e no Inline Success
// -------------------------------------------------------------

/* =========================================================
   CONFIG
   ========================================================= */
const API_BASE = "http://localhost:8080/api";
const ENDPOINTS = {
  orders: `${API_BASE}/orders`,
};

const UI_IDS = {
  emptyWrap: "checkoutEmpty",
  formWrap: "checkoutFormWrap",

  // customer
  name: "custName",
  phone: "custPhone",
  cep: "custCep",
  street: "custStreet",
  number: "custNumber",
  neighborhood: "custNeighborhood",
  city: "custCity",
  state: "custState",
  complement: "custComplement",

  // summary
  sumSubtotal: "sumSubtotal",
  sumDelivery: "sumDelivery",
  sumTotal: "sumTotal",

  // buttons
  btnCalcDelivery: "btnCalcDelivery",
  btnPay: "btnPay",
};

// DEV helper: mostra botão de simular pagamento no modal
const DEV_SHOW_SIMULATE_PAY = true;

// polling
const ORDER_POLL_INTERVAL_MS = 2000;
const ORDER_POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3 min

/* =========================================================
   HELPERS (strings, currency, debounce)
   ========================================================= */
function $(id) {
  return document.getElementById(id);
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function formatBRL(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function showToast(msg) {
  window.Utils?.showToast?.(msg) || console.log("[Toast]", msg);
}

function debounce(fn, wait = 450) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/* =========================================================
   BRL PARSE (FIX)
   - lida com "R$ 1.234,56", "12,00", "12.00", etc.
   ========================================================= */
function parseBRL(text) {
  const raw = String(text || "").replace(/[^\d,.-]/g, "");
  // remove todos os pontos de milhar
  const noThousands = raw.replace(/\./g, "");
  // troca vírgula decimal por ponto
  const normalized = noThousands.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/* =========================================================
   FIX: quebra “bonita” de IDs (nunca fica torto)
   - Usamos <wbr> a cada 4 chars pra quebra controlada
   ========================================================= */
function softWrapId(s) {
  return String(s || "")
    .replace(/(.{4})/g, "$1<wbr>")
    .replace(/<wbr>$/, "");
}

/* =========================================================
   NOVO: Pedido "bonitinho" (visual) DD/MM/AAAA-FRUTTZ-001
   - Mantém um alias fixo por orderId (não muda a cada refresh)
   ⚠️ Ainda é por navegador (localStorage). O certo depois é no backend/banco.
   ========================================================= */
function pad3(n) {
  return String(n).padStart(3, "0");
}

function todayParts() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return { dd, mm, yyyy, iso: `${yyyy}-${mm}-${dd}` };
}

function getDailySeq() {
  const t = todayParts();
  const key = `fruttz:order_seq:${t.iso}`;
  const v = Number(localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, String(v));
  return v;
}

function getPrettyOrderForId(orderId) {
  if (!orderId) return "—";

  try {
    const mapKey = "fruttz:pretty_order_map";
    const map = JSON.parse(localStorage.getItem(mapKey) || "{}");

    if (map[orderId]) return map[orderId];

    const t = todayParts();
    const seq = getDailySeq();
    const pretty = `${t.dd}/${t.mm}/${t.yyyy}-FRUTTZ-${pad3(seq)}`;

    map[orderId] = pretty;
    localStorage.setItem(mapKey, JSON.stringify(map));

    return pretty;
  } catch {
    const t = todayParts();
    return `${t.dd}/${t.mm}/${t.yyyy}-FRUTTZ-001`;
  }
}

/* =========================================================
   FOLLOW ORDER (index.html) — salva id do último pedido
   - Faz o botão aparecer no index quando a pessoa volta
   ========================================================= */
function saveLastOrderForFollow(orderId, txid) {
  try {
    if (orderId) localStorage.setItem("fruttz:last_order_id", String(orderId));
    if (txid) localStorage.setItem("fruttz:last_txid", String(txid));
    // se a pessoa ocultou o CTA no index, reativa quando há novo pedido
    localStorage.removeItem("fruttz:hide_follow_order");
  } catch {}
}

/* =========================================================
   API: ViaCEP
   ========================================================= */
async function fetchViaCep(cep) {
  const clean = onlyDigits(cep);
  if (clean.length !== 8) throw new Error("CEP inválido");

  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!res.ok) throw new Error("Falha ao buscar CEP");
  const data = await res.json();
  if (data.erro) throw new Error("CEP não encontrado");
  return data;
}

/* =========================================================
   FRETE POR BAIRRO (sem mapa)
   ========================================================= */
const DELIVERY_BY_NEIGHBORHOOD = (() => {
  const fee6 = 6;
  const fee12 = 12;
  const fee18 = 18;
  const fee24 = 24;

  const map = {
    // ANEL 1 — bem perto (R$ 6)
    [norm("Vila Pita")]: fee6,
    [norm("Imirim")]: fee6,
    [norm("Vila Amelia")]: fee6,
    [norm("Vila Espanhola")]: fee6,
    [norm("Vila Dionisia")]: fee6,
    [norm("Vila Santa Teresinha")]: fee6,
    [norm("Santa Teresinha")]: fee6,

    // ANEL 2 — perto (R$ 12)
    [norm("Casa Verde")]: fee12,
    [norm("Cachoeirinha")]: fee12,
    [norm("Limao")]: fee12,
    [norm("Mandaqui")]: fee12,
    [norm("Santana")]: fee12,
    [norm("Tucuruvi")]: fee12,
    [norm("Vila Guilherme")]: fee12,
    [norm("Vila Maria")]: fee12,
    [norm("Vila Medeiros")]: fee12,

    // ANEL 3 — médio (R$ 18)
    [norm("Freguesia do O")]: fee18,
    [norm("Brasilandia")]: fee18,
    [norm("Jardim Sao Bento")]: fee18,
    [norm("Jacana")]: fee18,
    [norm("Tremembe")]: fee18,
    [norm("Vila Nova Cachoeirinha")]: fee18,
    [norm("Vila Roque")]: fee18,
    [norm("Parque Mandaqui")]: fee18,
    [norm("Carandiru")]: fee18,

    // ANEL 4 — mais longe (R$ 24)
    [norm("Pirituba")]: fee24,
    [norm("Jaragua")]: fee24,
    [norm("Perus")]: fee24,
    [norm("Anhanguera")]: fee24,
    [norm("Sao Domingos")]: fee24,
  };

  return map;
})();

function getDeliveryFeeByNeighborhood(bairro, cidade, uf) {
  const isSP = norm(cidade) === norm("Sao Paulo") && norm(uf) === norm("SP");
  if (!isSP) return null;

  const key = norm(bairro);
  return DELIVERY_BY_NEIGHBORHOOD[key] ?? null;
}

/* =========================================================
   CART (integra com seu Storage)
   ========================================================= */
function cartItems() {
  return window.Storage?.getCart?.() || [];
}

function cartHasItems() {
  return cartItems().length > 0;
}

// ✅ FIX (AGORA): subtotal do checkout alinhado com o payload
// (unitPrice = base + addons) * quantity
function cartSubtotal() {
  const items = cartItems();
  return items.reduce((acc, it) => {
    const quantity = Number(it.quantity || it.qty || 1);
    const addonsTotal = calcAddonsTotal(it);
    const base = Number(it.basePrice ?? it.unitPrice ?? it.price ?? 0);
    const unitPrice = base + addonsTotal;
    return acc + unitPrice * quantity;
  }, 0);
}

// tenta limpar carrinho sem você precisar lembrar o método exato
function safeClearCart() {
  try {
    if (window.Storage?.clearCart) {
      window.Storage.clearCart();
      return;
    }

    if (window.Storage?.setCart) {
      window.Storage.setCart([]);
      return;
    }

    const keysToTry = ["fruttz_cart", "cart", "CART", "fruttz:cart", "FRUTTZ_CART"];
    keysToTry.forEach((k) => localStorage.removeItem(k));

    window.Storage?.updateCartBadge?.();
  } catch (e) {
    console.warn("[checkout] Falha limpando carrinho:", e);
  }
}

/* =========================================================
   ITENS: calcular adicionais (FIX)
   - SALADA: addons = [{price}]
   - AÇAÍ: addons = ["granola"...] + addonsPrice fixo por adicional
   ========================================================= */
function calcAddonsTotal(it) {
  // SALADA: addons é array de objetos com price
  if (Array.isArray(it.addons) && it.addons.length && typeof it.addons[0] === "object") {
    return it.addons.reduce((acc, a) => acc + Number(a?.price || 0), 0);
  }

  // AÇAÍ: addons é array de keys + addonsPrice (preço fixo por adicional)
  if (Array.isArray(it.addons) && it.addons.length && typeof it.addons[0] === "string") {
    const p = Number(it.addonsPrice || window.FRUTTZ_CONFIG?.addons?.acaiPrice || 0);
    return it.addons.length * p;
  }

  return 0;
}

/* =========================================================
   UI: resumo / validação / botão
   ========================================================= */
function setSummary(subtotal, deliveryFee) {
  const elSubtotal = $(UI_IDS.sumSubtotal);
  const elDelivery = $(UI_IDS.sumDelivery);
  const elTotal = $(UI_IDS.sumTotal);

  const total = Number(subtotal || 0) + Number(deliveryFee || 0);

  if (elSubtotal) elSubtotal.textContent = formatBRL(subtotal);
  if (elDelivery) elDelivery.textContent = deliveryFee != null ? formatBRL(deliveryFee) : "—";
  if (elTotal) elTotal.textContent = formatBRL(total);
}

function getSummaryNumbers() {
  const sub = cartSubtotal();

  const deliveryText = $(UI_IDS.sumDelivery)?.textContent?.trim();
  const delivery = deliveryText && deliveryText !== "—" ? parseBRL(deliveryText) : null;

  const total = delivery == null ? sub : sub + delivery;
  return { subtotal: sub, shipping: delivery, total };
}

function enablePayIfReady() {
  const btnPay = $(UI_IDS.btnPay);
  if (!btnPay) return;

  const name = $(UI_IDS.name)?.value?.trim();
  const phone = $(UI_IDS.phone)?.value?.trim();

  const cep = onlyDigits($(UI_IDS.cep)?.value);
  const street = $(UI_IDS.street)?.value?.trim();
  const number = $(UI_IDS.number)?.value?.trim();

  const { shipping } = getSummaryNumbers();

  const ok =
    !!name &&
    !!phone &&
    cep.length === 8 &&
    !!street &&
    !!number &&
    shipping != null &&
    cartHasItems();

  btnPay.disabled = !ok;
}

/* =========================================================
   DELIVERY FLOW (ViaCEP + frete por bairro)
   ========================================================= */
let __lastCepOk = "";
let __calculating = false;

async function calcDeliveryFlow(opts = {}) {
  const silent = !!opts.silent;
  const cepEl = $(UI_IDS.cep);
  const cep = onlyDigits(cepEl?.value);

  if (cep.length !== 8) {
    if (!silent) showToast("Digite um CEP válido (8 números).");
    return;
  }

  const deliveryShown = $(UI_IDS.sumDelivery)?.textContent;
  if (cep === __lastCepOk && deliveryShown && deliveryShown !== "—") {
    enablePayIfReady();
    return;
  }

  if (__calculating) return;
  __calculating = true;

  try {
    const data = await fetchViaCep(cep);

    const streetEl = $(UI_IDS.street);
    const neighEl = $(UI_IDS.neighborhood);
    const cityEl = $(UI_IDS.city);
    const stateEl = $(UI_IDS.state);

    if (streetEl) streetEl.value = data.logradouro || "";
    if (neighEl) neighEl.value = data.bairro || "";
    if (cityEl) cityEl.value = data.localidade || "";
    if (stateEl) stateEl.value = data.uf || "";

    const fee = getDeliveryFeeByNeighborhood(data.bairro, data.localidade, data.uf);

    if (fee == null) {
      setSummary(cartSubtotal(), null);
      __lastCepOk = "";
      enablePayIfReady();
      if (!silent) showToast("Ainda não entregamos nesse bairro (adicione na tabela de frete).");
      return;
    }

    setSummary(cartSubtotal(), fee);
    __lastCepOk = cep;

    enablePayIfReady();
  } catch (err) {
    console.error(err);
    __lastCepOk = "";
    setSummary(cartSubtotal(), null);
    enablePayIfReady();
    showToast("Erro no frete: " + (err?.message || "desconhecido"));
  } finally {
    __calculating = false;
  }
}

/* =========================================================
   BACKEND: Orders + Pix + Pay
   ========================================================= */
function buildOrderPayloadFromUI() {
  const { shipping } = getSummaryNumbers();
  if (shipping == null) throw new Error("Calcule o frete antes de continuar.");

  const items = cartItems().map((it) => {
    const quantity = Number(it.quantity || it.qty || 1);

    const addonsTotal = calcAddonsTotal(it);
    const base = Number(it.basePrice ?? it.unitPrice ?? it.price ?? 0);

    // ✅ preço unitário REAL (base + adicionais)
    const unitPrice = base + addonsTotal;

    // ✅ FIX (AGORA): total da linha SEM confiar em it.total (que pode ser só o unitário)
    const lineTotal = unitPrice * quantity;

    return {
      sku: it.sku,
      name: it.name,
      category: it.category,
      size: it.size,
      quantity,
      unitPrice: Number(unitPrice || 0),
      total: Number(lineTotal || 0),
      addons: it.addons ?? [],
      sucoPrep: it.sucoPrep ?? null,
      sucoSugar: it.sucoSugar ?? null,
    };
  });

  // ✅ subtotal sempre consistente com os itens calculados acima
  const subtotal = items.reduce((acc, it) => acc + Number(it.total || 0), 0);
  const total = subtotal + Number(shipping || 0);

  return {
    customer: {
      name: $(UI_IDS.name)?.value?.trim() || null,
      phone: $(UI_IDS.phone)?.value?.trim() || null,
      email: null,
      cpf: null,
    },
    delivery: {
      method: "DELIVERY",
      cep: onlyDigits($(UI_IDS.cep)?.value),
      addressLine: $(UI_IDS.street)?.value?.trim() || null,
      number: $(UI_IDS.number)?.value?.trim() || null,
      complement: $(UI_IDS.complement)?.value?.trim() || null,
      neighborhood: $(UI_IDS.neighborhood)?.value?.trim() || null,
      city: $(UI_IDS.city)?.value?.trim() || null,
      state: $(UI_IDS.state)?.value?.trim() || null,
    },
    items,
    pricing: {
      subtotal: Number(subtotal || 0),
      shipping: Number(shipping || 0),
      total: Number(total || 0),
    },
    notes: "",
  };
}

async function apiCreateOrder(payload) {
  const res = await fetch(ENDPOINTS.orders, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao criar pedido (${res.status}). ${txt}`);
  }

  return res.json();
}

async function apiGetOrder(orderId) {
  const res = await fetch(`${ENDPOINTS.orders}/${encodeURIComponent(orderId)}`, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar pedido (${res.status}). ${txt}`);
  }
  return res.json();
}

async function apiCreatePixIntent(orderId) {
  const res = await fetch(`${ENDPOINTS.orders}/${encodeURIComponent(orderId)}/pix`, {
    method: "POST",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao gerar Pix (${res.status}). ${txt}`);
  }

  return res.json();
}

async function apiMarkPaid(orderId) {
  const res = await fetch(`${ENDPOINTS.orders}/${encodeURIComponent(orderId)}/pay`, {
    method: "POST",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao confirmar pagamento (${res.status}). ${txt}`);
  }

  return res.json();
}

/* =========================================================
   UI: Modal Pix (criado via JS)
   ========================================================= */
let __pixPollTimer = null;
let __pixPollStartedAt = 0;
let __pixCurrentOrderId = null;
let __pixCurrentTxid = null;

function stopPixPolling() {
  if (__pixPollTimer) {
    clearInterval(__pixPollTimer);
    __pixPollTimer = null;
  }
  __pixPollStartedAt = 0;
  __pixCurrentOrderId = null;
  __pixCurrentTxid = null;
}

function ensurePixModal() {
  if (document.getElementById("pixBackdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.id = "pixBackdrop";

  const modal = document.createElement("div");
  modal.id = "pixModal";

  modal.innerHTML = window.TPL.checkoutPixModal();

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function close() {
    stopPixPolling();
    backdrop.classList.remove("is-open");
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  document.getElementById("pixClose")?.addEventListener("click", close);
  document.getElementById("pixDone")?.addEventListener("click", close);

  document.getElementById("pixCopy")?.addEventListener("click", async () => {
    const text = document.getElementById("pixCode")?.value || "";
    try {
      await navigator.clipboard.writeText(text);
      showToast("Código Pix copiado ✅");
    } catch {
      const ta = document.getElementById("pixCode");
      ta?.select?.();
      document.execCommand("copy");
      showToast("Código Pix copiado ✅");
    }
  });

  document.getElementById("pixSimPay")?.addEventListener("click", async () => {
    if (!__pixCurrentOrderId) return;
    try {
      await apiMarkPaid(__pixCurrentOrderId);
      showToast("Pagamento simulado ✅");
      await checkOrderPaidOnce(__pixCurrentOrderId);
    } catch (e) {
      console.error(e);
      showToast(e?.message || "Falha ao simular pagamento");
    }
  });
}


// ✅ aqui muda o Pedido no modal Pix
function setPixMeta({ orderId, txid, status }) {
  const metaEl = document.getElementById("pixMeta");
  if (!metaEl) return;

  const pretty = getPrettyOrderForId(orderId);

  metaEl.innerHTML = window.TPL.checkoutPixMeta({
    isPaid: status === "PAID",
    prettyOrder: pretty,
    txid,
    status,
  });
}

function openPixModal({ orderId, txid, copyPaste, status }) {
  ensurePixModal();

  __pixCurrentOrderId = orderId;
  __pixCurrentTxid = txid;

  const backdrop = document.getElementById("pixBackdrop");
  const codeEl = document.getElementById("pixCode");
  const titleEl = document.getElementById("pixTitle");
  const subEl = document.getElementById("pixSubtitle");

  if (codeEl) codeEl.value = copyPaste || "";

  if (titleEl) titleEl.textContent = "Pagar com Pix";
  if (subEl) subEl.textContent = "Use o “copia e cola” no seu banco";

  setPixMeta({ orderId, txid, status });

  const devRow = document.getElementById("pixDevRow");
  if (devRow) devRow.classList.toggle("is-visible", DEV_SHOW_SIMULATE_PAY);

  if (backdrop) backdrop.classList.add("is-open");

  startPixPolling(orderId, txid);
}

async function checkOrderPaidOnce(orderId) {
  const latest = await apiGetOrder(orderId);
  const status = latest?.status || "UNKNOWN";

  const txid = __pixCurrentTxid || "-";

  if (status === "PAID") {
    await onOrderPaid({ orderId, txid });
  } else {
    setPixMeta({ orderId, txid, status });
  }
}

function startPixPolling(orderId, txid) {
  stopPixPolling();

  __pixPollStartedAt = Date.now();
  __pixCurrentOrderId = orderId;
  __pixCurrentTxid = txid;

  __pixPollTimer = setInterval(async () => {
    try {
      if (Date.now() - __pixPollStartedAt > ORDER_POLL_TIMEOUT_MS) {
        stopPixPolling();
        console.warn("[pix] Polling timeout");
        return;
      }

      const latest = await apiGetOrder(orderId);
      const status = latest?.status || "UNKNOWN";

      setPixMeta({ orderId, txid, status });

      if (status === "PAID") {
        await onOrderPaid({ orderId, txid });
      }
    } catch (e) {
      console.warn("[pix] Poll error:", e?.message || e);
    }
  }, ORDER_POLL_INTERVAL_MS);
}

async function onOrderPaid({ orderId, txid }) {
  stopPixPolling();

  // ✅ salva pro botão do index / success
  saveLastOrderForFollow(orderId, txid);

  // ✅ AGORA SIM limpa carrinho (somente quando pago)
  safeClearCart();
  window.Storage?.updateCartBadge?.();

  // fecha o modal Pix
  const pixBackdrop = document.getElementById("pixBackdrop");
  if (pixBackdrop) pixBackdrop.classList.remove("is-open");

  // vai para acompanhar pedido
  window.location.href = `success.html?id=${encodeURIComponent(orderId)}`;
}

/* =========================================================
   INLINE SUCCESS (Fruttz style) — 2 botões, sem X, ID alinhado
   ========================================================= */
function ensureInlineSuccessUI() {
  if (document.getElementById("fruttzSuccessBackdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.id = "fruttzSuccessBackdrop";

  const card = document.createElement("div");
  card.id = "fruttzSuccessCard";

  card.innerHTML = window.TPL.checkoutInlineSuccess();

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  function close() {
    backdrop.classList.remove("is-open");
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  document.getElementById("fruttzSuccessGoMenu")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // ✅ "Ver detalhes" precisa ir com o UUID real (não o texto bonitinho)
  document.getElementById("fruttzSuccessDetails")?.addEventListener("click", () => {
    const realId = document.getElementById("fruttzSuccessOrderId")?.dataset?.orderid || "";
    if (!realId) return;
    window.location.href = `success.html?id=${encodeURIComponent(realId)}`;
  });
}

function showInlineSuccess({ orderId, txid }) {
  // mantém salvo pra botão do index
  saveLastOrderForFollow(orderId, txid);

  // fecha o Pix modal (se estiver aberto)
  const pixBackdrop = document.getElementById("pixBackdrop");
  if (pixBackdrop) pixBackdrop.classList.remove("is-open");

  // vai direto pra tela de acompanhar pedido
  window.location.href = `success.html?id=${encodeURIComponent(orderId)}`;
}

/* =========================================================
   CHECKOUT ACTION: clicar em pagar
   ========================================================= */
/* =========================================================
   CHECKOUT ACTION: clicar em pagar
   - NOVO: cria pedido + gera pix e REDIRECIONA para success.html?id=
   ========================================================= */
async function handlePayClick() {
  const btnPay = $(UI_IDS.btnPay);
  if (!btnPay) return;

  btnPay.disabled = true;
  const originalText = btnPay.textContent;
  btnPay.textContent = "Criando pedido...";

  try {
    // 1) cria pedido
    const payload = buildOrderPayloadFromUI();
    const created = await apiCreateOrder(payload);

    // ✅ já salva o último pedido pro botão “acompanhar” aparecer no index
    saveLastOrderForFollow(created?.id);

    // 2) gera pix
    btnPay.textContent = "Gerando Pix...";
    const pix = await apiCreatePixIntent(created.id);

    // salva txid / last order
    const orderId = pix?.orderId || created.id;
    const txid = pix?.txid || null;
    saveLastOrderForFollow(orderId, txid);

    // 3) (opcional) salva o copia-e-cola pra success carregar instantâneo depois
    try {
      localStorage.setItem(`fruttz:pix_copy:${orderId}`, String(pix?.copyPaste || ""));
      localStorage.setItem(`fruttz:pix_txid:${orderId}`, String(txid || ""));
    } catch {}

    showToast("Pedido criado ✅ Pix gerado ✅");



    // ✅ 4) ABRE MODAL PIX (em vez de redirecionar)
    openPixModal({
      orderId,
      txid: txid || "-",
      copyPaste: pix?.copyPaste || "",
      status: "WAITING_PAYMENT",
    });

  } catch (err) {
    console.error(err);
    showToast(err?.message || "Erro ao finalizar pedido");
  } finally {
    // ✅ aqui a gente reabilita porque não redireciona mais
    if (btnPay) {
      btnPay.textContent = originalText || "Pagar (Pix / Cartão)";
      enablePayIfReady();
    }
  }
}



/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  window.Storage?.updateCartBadge?.();

  const emptyWrap = $(UI_IDS.emptyWrap);
  const formWrap = $(UI_IDS.formWrap);

  if (!cartHasItems()) {
    emptyWrap?.classList.remove("hidden");
    formWrap?.classList.add("hidden");
    return;
  }

  setSummary(cartSubtotal(), null);

  $(UI_IDS.btnCalcDelivery)?.addEventListener("click", () => {
    calcDeliveryFlow({ silent: false });
  });

  const cepEl = $(UI_IDS.cep);
  const autoCalc = debounce(() => {
    const c = onlyDigits(cepEl?.value);
    if (c.length === 8) calcDeliveryFlow({ silent: true });
  }, 450);

  cepEl?.addEventListener("input", autoCalc);

  cepEl?.addEventListener("blur", () => {
    const c = onlyDigits(cepEl?.value);
    if (c.length === 8) calcDeliveryFlow({ silent: false });
  });

  [
    UI_IDS.name,
    UI_IDS.phone,
    UI_IDS.cep,
    UI_IDS.street,
    UI_IDS.number,
    UI_IDS.neighborhood,
    UI_IDS.city,
    UI_IDS.state,
    UI_IDS.complement,
  ].forEach((id) => $(id)?.addEventListener("input", enablePayIfReady));

  $(UI_IDS.btnPay)?.addEventListener("click", handlePayClick);

  enablePayIfReady();
});
