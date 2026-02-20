/**
 * menu.js — Cardápio (render + filtros + modal + carrinho)
 * =========================================================
 * - Carrega produtos do backend (GET /api/products)
 * - Renderiza cards + busca + filtro por categoria
 * - Modal: tamanho (ml/g), opções de suco (água/leite + açúcar), adicionais (açaí/salada)
 * - Calcula total e adiciona ao carrinho
 *
 * Dependências esperadas:
 * - window.Utils.normalizeText / Utils.formatBRL
 * - window.Storage.addToCart / Storage.updateCartBadge
 * - window.TPL (templates)
 */

// =========================================================
// ESTADO GLOBAL
// =========================================================
let activeCategory = ""; // "" = todos
let searchTerm = "";
let PRODUCTS = [];

// SKU especial (card informativo)
const SOON_SKU = "EM-BREVE";

// =========================================================
// PREÇOS (base)
// =========================================================
const PRICE_RULES = {
  suco: {
    VERDE: { "300": 9.00, "500": 12.00 },
    ESPECIAL: { "300": 14.00, "500": 16.00 },
    FUNCIONAL: { "300": 12.00, "500": 14.00 },
    TRADICIONAL: { "300": 12.00, "500": 14.00 }
  },

  // AÇAÍ simples (base)
  acaiBase: { "300": 18.00, "400": 22.00, "500": 26.00 },

  // Salada (base)
  saladaBase: { "300": 14.0, "500": 16.0 }
};

// =========================================================
// ADICIONAIS (em ORDEM + preços fixos)
// =========================================================
const ACAI_ADDONS = [
  { key: "granola", label: "Granola", price: 2.00, nutri: { kcal: 80, carb: 12.0, prot: 2.0, fat: 2.5, fiber: 2.5, sod: 10 } },
  { key: "banana", label: "Banana", price: 2.00, nutri: { kcal: 30, carb: 8.0, prot: 0.4, fat: 0.1, fiber: 1.0, sod: 1 } },
  { key: "uva_verde", label: "Uva verde", price: 2.00, nutri: { kcal: 34, carb: 9.0, prot: 0.3, fat: 0.1, fiber: 0.7, sod: 1 } },

  { key: "leite_ninho", label: "Leite Ninho", price: 2.50, nutri: { kcal: 70, carb: 6.0, prot: 3.0, fat: 3.5, fiber: 0.0, sod: 40 } },
  { key: "leite_condensado", label: "Leite condensado", price: 2.50, nutri: { kcal: 65, carb: 11.0, prot: 1.2, fat: 1.8, fiber: 0.0, sod: 20 } },

  { key: "morango", label: "Morango", price: 3.00, nutri: { kcal: 18, carb: 4.3, prot: 0.4, fat: 0.1, fiber: 1.1, sod: 1 } },

  // nutri aproximada só pra tabela não ficar “zerada”
  { key: "nutella", label: "Nutella", price: 4.00, nutri: { kcal: 80, carb: 9.0, prot: 1.0, fat: 4.5, fiber: 1.0, sod: 10 } }
];

const SALADA_ADDONS = [
  { key: "banana", label: "Banana", price: 2.50, nutri: { kcal: 30, carb: 8.0, prot: 0.4, fat: 0.1, fiber: 1.0, sod: 1 } },
  { key: "mamao", label: "Mamão", price: 2.00, nutri: { kcal: 20, carb: 5.0, prot: 0.3, fat: 0.1, fiber: 0.8, sod: 1 } },
  { key: "manga", label: "Manga", price: 2.00, nutri: { kcal: 30, carb: 7.5, prot: 0.4, fat: 0.1, fiber: 0.8, sod: 1 } },
  { key: "maca", label: "Maçã", price: 2.00, nutri: { kcal: 25, carb: 6.5, prot: 0.1, fat: 0.1, fiber: 1.2, sod: 1 } },
  { key: "melao", label: "Melão", price: 2.00, nutri: { kcal: 15, carb: 3.8, prot: 0.3, fat: 0.1, fiber: 0.5, sod: 3 } },
  { key: "abacaxi", label: "Abacaxi", price: 2.00, nutri: { kcal: 22, carb: 5.6, prot: 0.2, fat: 0.1, fiber: 0.7, sod: 1 } },

  { key: "kiwi", label: "Kiwi", price: 3.00, nutri: { kcal: 30, carb: 7.0, prot: 0.6, fat: 0.3, fiber: 2.0, sod: 2 } },
  { key: "morango", label: "Morango", price: 3.00, nutri: { kcal: 18, carb: 4.3, prot: 0.4, fat: 0.1, fiber: 1.1, sod: 1 } },
  { key: "uva_verde", label: "Uva verde", price: 2.00, nutri: { kcal: 34, carb: 9.0, prot: 0.3, fat: 0.1, fiber: 0.7, sod: 1 } },

  { key: "leite_condensado", label: "Leite condensado", price: 2.50, nutri: { kcal: 65, carb: 11.0, prot: 1.2, fat: 1.8, fiber: 0.0, sod: 20 } },
  { key: "leite_em_po", label: "Leite em pó", price: 2.50, nutri: { kcal: 60, carb: 6.0, prot: 3.5, fat: 3.0, fiber: 0.0, sod: 40 } },
  { key: "granola", label: "Granola", price: 2.00, nutri: { kcal: 80, carb: 12.0, prot: 2.0, fat: 2.5, fiber: 2.5, sod: 10 } }
];

// =========================================================
// OPÇÕES DO SUCO (modal)
// =========================================================
const SUCO_PREP_OPTIONS = [
  { key: "agua", label: "Com água" },
  { key: "leite", label: "Com leite" }
];

const SUCO_SUGAR_OPTIONS = [
  { key: "sem_acucar", label: "Sem açúcar" },
  { key: "com_acucar", label: "Com açúcar" }
];

// =========================================================
// NUTRIÇÃO (estimada, só o necessário)
// =========================================================
const NUTRI_BASE = {
  sucoLine: {
    TRADICIONAL: { kcal: 130, carb: 30, prot: 1.5, fat: 0.4, fiber: 2.2, sod: 8 },
    ESPECIAL: { kcal: 160, carb: 36, prot: 2.0, fat: 0.6, fiber: 3.0, sod: 10 },
    FUNCIONAL: { kcal: 145, carb: 32, prot: 2.2, fat: 0.8, fiber: 3.6, sod: 18 },
    VERDE: { kcal: 95, carb: 20, prot: 2.0, fat: 0.5, fiber: 4.0, sod: 22 }
  },

  sucoDelta: {
    leite300: { kcal: 92, carb: 7.2, prot: 4.8, fat: 5.0, fiber: 0.0, sod: 65 },
    leite500: { kcal: 122, carb: 9.6, prot: 6.4, fat: 6.6, fiber: 0.0, sod: 86 },
    acucar300: { kcal: 100, carb: 25.0, prot: 0.0, fat: 0.0, fiber: 0.0, sod: 0 },
    acucar500: { kcal: 125, carb: 31.3, prot: 0.0, fat: 0.0, fiber: 0.0, sod: 0 }
  },

  acaiBase: { kcal: 360, carb: 48, prot: 6.0, fat: 14.0, fiber: 8.0, sod: 35 },
  // Só o simples (já que só ele aparece)
  acaiSkuDelta: { "ACAI-SIMPLES": { kcal: 0, carb: 0, prot: 0, fat: 0, fiber: 0, sod: 0 } },

  saladaBase: { kcal: 165, carb: 40, prot: 2.2, fat: 0.6, fiber: 5.2, sod: 8 }
};

// =========================================================
// HELPERS: Nutrição
// =========================================================
function scaleNutriValues(base, factor) {
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(base.kcal * factor),
    carb: round1(base.carb * factor),
    prot: round1(base.prot * factor),
    fat: round1(base.fat * factor),
    fiber: round1(base.fiber * factor),
    sod: Math.round(base.sod * factor)
  };
}

function addNutri(a, b) {
  return {
    kcal: (a.kcal || 0) + (b.kcal || 0),
    carb: (a.carb || 0) + (b.carb || 0),
    prot: (a.prot || 0) + (b.prot || 0),
    fat: (a.fat || 0) + (b.fat || 0),
    fiber: (a.fiber || 0) + (b.fiber || 0),
    sod: (a.sod || 0) + (b.sod || 0)
  };
}

function getNutrition(product, size, opts = {}) {
  if (!size) size = product?.sizes?.[0] || "300";

  // ===== SUCO =====
  if (product.category === "SUCO") {
    const line = product.line || "TRADICIONAL";
    const base = NUTRI_BASE.sucoLine[line] || NUTRI_BASE.sucoLine.TRADICIONAL;

    const factor = Number(size) / 300;
    let v = scaleNutriValues(base, factor);

    const prep = opts.sucoPrep || "agua";
    const sugar = opts.sucoSugar || "sem_acucar";

    if (prep === "leite") {
      v = addNutri(v, size === "500" ? NUTRI_BASE.sucoDelta.leite500 : NUTRI_BASE.sucoDelta.leite300);
    }
    if (sugar === "com_acucar") {
      v = addNutri(v, size === "500" ? NUTRI_BASE.sucoDelta.acucar500 : NUTRI_BASE.sucoDelta.acucar300);
    }

    return {
      serving: `${size}ml`,
      rows: [
        ["Calorias", `${Math.round(v.kcal)} kcal`],
        ["Carboidratos", `${Math.round(v.carb * 10) / 10} g`],
        ["Proteínas", `${Math.round(v.prot * 10) / 10} g`],
        ["Gorduras totais", `${Math.round(v.fat * 10) / 10} g`],
        ["Fibras", `${Math.round(v.fiber * 10) / 10} g`],
        ["Sódio", `${Math.round(v.sod)} mg`]
      ]
    };
  }

  // ===== AÇAÍ =====
  if (product.category === "ACAI") {
    const base = { ...NUTRI_BASE.acaiBase };
    const delta = NUTRI_BASE.acaiSkuDelta[String(product.sku || "").toUpperCase()] || NUTRI_BASE.acaiSkuDelta["ACAI-SIMPLES"];

    const merged0 = addNutri(base, delta);
    const factor = Number(size) / 300;
    let v = scaleNutriValues(merged0, factor);

    const addons = Array.isArray(opts.addons) ? opts.addons : [];
    addons.forEach((k) => {
      const found = ACAI_ADDONS.find((a) => a.key === k);
      if (found?.nutri) v = addNutri(v, found.nutri);
    });

    return {
      serving: `${size}g`,
      rows: [
        ["Calorias", `${Math.round(v.kcal)} kcal`],
        ["Carboidratos", `${Math.round(v.carb * 10) / 10} g`],
        ["Proteínas", `${Math.round(v.prot * 10) / 10} g`],
        ["Gorduras totais", `${Math.round(v.fat * 10) / 10} g`],
        ["Fibras", `${Math.round(v.fiber * 10) / 10} g`],
        ["Sódio", `${Math.round(v.sod)} mg`]
      ]
    };
  }

  // ===== SALADA =====
  if (product.category === "SALADA") {
    const base = { ...NUTRI_BASE.saladaBase };
    const factor = Number(size) / 300;
    let v = scaleNutriValues(base, factor);

    const addons = Array.isArray(opts.addons) ? opts.addons : [];
    addons.forEach((k) => {
      const found = SALADA_ADDONS.find((a) => a.key === k);
      if (found?.nutri) v = addNutri(v, found.nutri);
    });

    return {
      serving: `${size}g`,
      rows: [
        ["Calorias", `${Math.round(v.kcal)} kcal`],
        ["Carboidratos", `${Math.round(v.carb * 10) / 10} g`],
        ["Proteínas", `${Math.round(v.prot * 10) / 10} g`],
        ["Gorduras totais", `${Math.round(v.fat * 10) / 10} g`],
        ["Fibras", `${Math.round(v.fiber * 10) / 10} g`],
        ["Sódio", `${Math.round(v.sod)} mg`]
      ]
    };
  }

  return { serving: "-", rows: [] };
}

// =========================================================
// HELPERS: Preço
// =========================================================
function getBasePrice(product, size) {
  if (product.category === "SUCO") {
    const line = product.line || "TRADICIONAL";
    return PRICE_RULES.suco?.[line]?.[size] ?? 0;
  }

  if (product.category === "ACAI") {
    return PRICE_RULES.acaiBase[size] ?? 0;
  }

  if (product.category === "SALADA") {
    return PRICE_RULES.saladaBase[size] ?? 0;
  }

  return 0;
}

// =========================================================
// BACKEND: carregar produtos
// =========================================================
async function loadProducts() {
  const url = "http://localhost:8080/api/products";
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao carregar produtos (${res.status}). ${txt}`);
  }

  const data = await res.json();
  PRODUCTS = Array.isArray(data) ? data : (data?.items || []);
}

// =========================================================
// RENDER: Cards do cardápio
// =========================================================
function renderProducts() {
  const grid = document.getElementById("products");
  if (!grid) return;

  const term = Utils.normalizeText(searchTerm);

  const filtered = PRODUCTS
    // Mantém todos SUCOS + SALADA, e do AÇAÍ só o ACAI-SIMPLES, e permite o card "EM-BREVE"
    .filter((p) => {
      const sku = String(p.sku || "").toUpperCase();
      const cat = String(p.category || "").toUpperCase();

      if (sku === SOON_SKU) return true;

      if (cat === "ACAI") return sku === "ACAI-SIMPLES";
      return cat === "SUCO" || cat === "SALADA";
    })
    // Busca + chip de categoria
    .filter((p) => {
      const byCat = activeCategory ? p.category === activeCategory : true;
      if (!term) return byCat;

      const hay = Utils.normalizeText(
        `${p.name} ${p.desc} ${(p.tags || []).join(" ")} ${p.category} ${p.line || ""}`
      );
      return byCat && hay.includes(term);
    })
    // Renomeia o açaí simples no CARD
    .map((p) => {
      const isAcaiSimples =
        String(p.category || "").toUpperCase() === "ACAI" &&
        String(p.sku || "").toUpperCase() === "ACAI-SIMPLES";

      return isAcaiSimples ? { ...p, name: "Açaí" } : p;
    });

  if (filtered.length === 0) {
    grid.innerHTML = window.TPL.menuEmpty();
    return;
  }

  grid.innerHTML = filtered.map((p) => cardTemplate(p)).join("");
  bindAddButtons();
}

function cardTemplate(p) {
  const isSoon = String(p.sku || "").toUpperCase() === SOON_SKU;

  const tagClass = isSoon
    ? "yellow"
    : (p.category === "SUCO" ? "green" : (p.category === "ACAI" ? "pink" : "yellow"));

  const tagLabel = isSoon
    ? "Novidades"
    : (p.category === "SUCO" ? "Suco" : (p.category === "ACAI" ? "Açaí" : "Salada"));

  const minSize = p.sizes?.[0];
  const fromPrice = (!isSoon && minSize) ? getBasePrice(p, minSize) : 0;

  return window.TPL.menuCard({
    sku: p.sku,
    name: p.name,
    desc: p.desc,
    tagClass,
    tagLabel,
    tags: p.tags || [],
    fromPriceText: isSoon ? "Em breve" : Utils.formatBRL(fromPrice),
  });
}

function bindAddButtons() {
  document.querySelectorAll(".js-open-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sku = String(btn.getAttribute("data-sku") || "").toUpperCase();

      // Card informativo: não abre modal
      if (sku === SOON_SKU) return;

      const product = PRODUCTS.find((p) => String(p.sku || "").toUpperCase() === sku);
      if (!product) return;

      const isAcaiSimples =
        String(product.category || "").toUpperCase() === "ACAI" &&
        String(product.sku || "").toUpperCase() === "ACAI-SIMPLES";

      openModal(isAcaiSimples ? { ...product, name: "Açaí" } : product);
    });
  });
}

// =========================================================
// MODAL: estado
// =========================================================
let modalSku = null;
let selectedSize = null;
let selectedAddons = new Set();
let selectedSucoPrep = "agua";
let selectedSucoSugar = "sem_acucar";

function updateNutrition(product, size, nutriServingEl, nutriBodyEl) {
  const info = getNutrition(product, size, {
    sucoPrep: selectedSucoPrep,
    sucoSugar: selectedSucoSugar,
    addons: Array.from(selectedAddons)
  });

  nutriServingEl.textContent = `Porção: ${info.serving || "-"}`;
  nutriBodyEl.innerHTML = window.TPL.nutritionRows(info.rows || []);
}

function calcModalTotal(product) {
  const base = getBasePrice(product, selectedSize);
  let addonsTotal = 0;

  if (product.category === "ACAI") {
    addonsTotal = Array.from(selectedAddons).reduce((acc, key) => {
      const found = ACAI_ADDONS.find((a) => a.key === key);
      return acc + Number(found?.price || 0);
    }, 0);
  }

  if (product.category === "SALADA") {
    addonsTotal = Array.from(selectedAddons).reduce((acc, key) => {
      const found = SALADA_ADDONS.find((a) => a.key === key);
      return acc + Number(found?.price || 0);
    }, 0);
  }

  return Number(base) + Number(addonsTotal);
}

function openModal(product) {
  modalSku = product.sku;
  selectedAddons = new Set();
  selectedSize = (product.sizes && product.sizes[0]) ? product.sizes[0] : null;

  selectedSucoPrep = "agua";
  selectedSucoSugar = "sem_acucar";

  const backdrop = document.getElementById("modalBackdrop");
  const modal = document.getElementById("productModal");

  const title = document.getElementById("modalTitle");
  const subtitle = document.getElementById("modalSubtitle");
  const totalEl = document.getElementById("modalTotal");

  const addonsList = document.getElementById("addonsList");
  const nutriServing = document.getElementById("nutriServing");
  const nutriBody = document.getElementById("nutriTableBody");

  title.textContent = product.name;
  subtitle.textContent = product.desc;

  ensureSizeSelector(product);
  ensureSucoOptions(product);

  const addonsTitle = document.querySelector('[data-role="addons-title"]');
  const addonsWrap = document.querySelector('[data-role="addons-wrap"]');

  if (addonsTitle) addonsTitle.textContent = "Adicionais";

  if (product.category === "ACAI" || product.category === "SALADA") {
    addonsTitle?.classList.remove("hidden");
    addonsWrap?.classList.remove("hidden");

    const list = product.category === "ACAI" ? ACAI_ADDONS : SALADA_ADDONS;

    addonsList.innerHTML = list
      .map((a) => window.TPL.modalAddonItem({
        key: a.key,
        label: a.label,
        priceText: Utils.formatBRL(a.price)
      }))
      .join("");

    modal.querySelectorAll(".js-addon").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-addon");
        if (cb.checked) selectedAddons.add(key);
        else selectedAddons.delete(key);

        totalEl.textContent = Utils.formatBRL(calcModalTotal(product));
        updateNutrition(product, selectedSize, nutriServing, nutriBody);
      });
    });
  } else {
    addonsList.innerHTML = "";
    addonsTitle?.classList.add("hidden");
    addonsWrap?.classList.add("hidden");
  }

  updateNutrition(product, selectedSize, nutriServing, nutriBody);
  totalEl.textContent = Utils.formatBRL(calcModalTotal(product));

  backdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
  document.getElementById("modalClose")?.focus();
}

function ensureSizeSelector(product) {
  const modalBody = document.querySelector(".modal-body");
  if (!modalBody) return;

  let sizeBlock = document.getElementById("sizeBlock");
  if (!sizeBlock) {
    sizeBlock = document.createElement("div");
    sizeBlock.id = "sizeBlock";
    sizeBlock.style.marginBottom = "12px";
    sizeBlock.innerHTML = window.TPL.modalSizeBlock();
    modalBody.insertBefore(sizeBlock, modalBody.firstChild);
  }

  const sizeOptions = document.getElementById("sizeOptions");
  sizeOptions.innerHTML = "";

  (product.sizes || []).forEach((sz) => {
    const label = product.category === "SUCO" ? `${sz}ml` : `${sz}g`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = label;
    if (sz === selectedSize) btn.classList.add("active");

    btn.addEventListener("click", () => {
      selectedSize = sz;
      sizeOptions.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");

      updateNutrition(
        product,
        selectedSize,
        document.getElementById("nutriServing"),
        document.getElementById("nutriTableBody")
      );

      document.getElementById("modalTotal").textContent = Utils.formatBRL(calcModalTotal(product));
    });

    sizeOptions.appendChild(btn);
  });
}

function ensureSucoOptions(product) {
  const modalBody = document.querySelector(".modal-body");
  if (!modalBody) return;

  let sucoBlock = document.getElementById("sucoBlock");
  if (!sucoBlock) {
    sucoBlock = document.createElement("div");
    sucoBlock.id = "sucoBlock";
    sucoBlock.style.marginBottom = "12px";
    sucoBlock.innerHTML = window.TPL.modalSucoBlock();

    const sizeBlock = document.getElementById("sizeBlock");
    if (sizeBlock && sizeBlock.parentElement === modalBody) {
      modalBody.insertBefore(sucoBlock, sizeBlock.nextSibling);
    } else {
      modalBody.insertBefore(sucoBlock, modalBody.firstChild);
    }
  }

  if (product.category !== "SUCO") {
    sucoBlock.classList.add("hidden");
    return;
  }
  sucoBlock.classList.remove("hidden");

  const prepWrap = document.getElementById("sucoPrepOptions");
  const sugarWrap = document.getElementById("sucoSugarOptions");
  if (!prepWrap || !sugarWrap) return;

  prepWrap.innerHTML = "";
  sugarWrap.innerHTML = "";

  SUCO_PREP_OPTIONS.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = opt.label;
    if (opt.key === selectedSucoPrep) btn.classList.add("active");

    btn.addEventListener("click", () => {
      selectedSucoPrep = opt.key;
      prepWrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");

      updateNutrition(
        product,
        selectedSize,
        document.getElementById("nutriServing"),
        document.getElementById("nutriTableBody")
      );
    });

    prepWrap.appendChild(btn);
  });

  SUCO_SUGAR_OPTIONS.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = opt.label;
    if (opt.key === selectedSucoSugar) btn.classList.add("active");

    btn.addEventListener("click", () => {
      selectedSucoSugar = opt.key;
      sugarWrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");

      updateNutrition(
        product,
        selectedSize,
        document.getElementById("nutriServing"),
        document.getElementById("nutriTableBody")
      );
    });

    sugarWrap.appendChild(btn);
  });
}

function closeModal() {
  document.getElementById("modalBackdrop")?.classList.add("hidden");
  document.getElementById("productModal")?.classList.add("hidden");
  modalSku = null;
  selectedSize = null;
  selectedAddons = new Set();
  selectedSucoPrep = "agua";
  selectedSucoSugar = "sem_acucar";
}

// =========================================================
// ANIMAÇÃO “Adicionar → carrinho” (mantida)
// =========================================================
function animateAddToCart(originBtn) {
  if (!originBtn) return;

  originBtn.classList.remove("btn-pop");
  void originBtn.offsetWidth;
  originBtn.classList.add("btn-pop");

  const cartBtn = document.querySelector(".icon-btn.icon-btn-green");
  if (!cartBtn) return;

  const a = originBtn.getBoundingClientRect();
  const b = cartBtn.getBoundingClientRect();

  const startX = a.left + a.width / 2;
  const startY = a.top + a.height / 2;
  const endX = b.left + b.width / 2;
  const endY = b.top + b.height / 2;

  const dot = document.createElement("div");
  dot.className = "fly-dot";
  dot.style.left = `${startX - 6}px`;
  dot.style.top = `${startY - 6}px`;
  dot.style.background = `radial-gradient(circle at 30% 30%,
    rgba(255,255,255,.95),
    rgba(255,255,255,.20) 35%,
    rgba(89,160,77,.95) 70%
  )`;
  document.body.appendChild(dot);

  const trail = document.createElement("div");
  trail.className = "fly-trail";
  document.body.appendChild(trail);

  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 140;

  function qBezier(t, p0, p1, p2) {
    const u = 1 - t;
    return u * u * p0 + 2 * u * t * p1 + t * t * p2;
  }

  let lastX = startX, lastY = startY;

  const duration = 620;
  const t0 = performance.now();

  function frame(now) {
    const elapsed = now - t0;
    const t = Math.min(1, elapsed / duration);

    const ease = 1 - Math.pow(1 - t, 3);

    const x = qBezier(ease, startX, midX, endX);
    const y = qBezier(ease, startY, midY, endY);

    dot.style.left = `${x - 6}px`;
    dot.style.top = `${y - 6}px`;

    const r = Math.round(89 + (240 - 89) * t);
    const g = Math.round(160 + (98 - 160) * t);
    const b2 = Math.round(77 + (150 - 77) * t);

    dot.style.background = `radial-gradient(circle at 30% 30%,
      rgba(255,255,255,.95),
      rgba(255,255,255,.20) 35%,
      rgba(${r},${g},${b2},.95) 70%
    )`;

    const dx = x - lastX;
    const dy = y - lastY;
    const len = Math.max(10, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    trail.style.width = `${len}px`;
    trail.style.left = `${lastX}px`;
    trail.style.top = `${lastY}px`;
    trail.style.transform = `rotate(${angle}deg)`;
    trail.style.transformOrigin = "0 50%";
    trail.style.opacity = String(0.85 * (1 - t) + 0.15);

    lastX = x;
    lastY = y;

    if (t < 1) requestAnimationFrame(frame);
    else finish();
  }

  requestAnimationFrame(frame);

  function finish() {
    dot.remove();
    trail.remove();

    cartBtn.classList.remove("cart-pop");
    void cartBtn.offsetWidth;
    cartBtn.classList.add("cart-pop");

    const badge = cartBtn.querySelector(".badge") || document.querySelector(".badge");
    if (badge) {
      badge.classList.remove("badge-bounce");
      void badge.offsetWidth;
      badge.classList.add("badge-bounce");
    }

    burst(endX, endY);
  }

  function burst(x, y) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "spark";
      s.style.left = `${x - 3}px`;
      s.style.top = `${y - 3}px`;

      if (i % 2 === 0) s.style.background = "rgba(89,160,77,.92)";
      document.body.appendChild(s);

      const ang = Math.PI * 2 * (i / count);
      const dist = 26 + Math.random() * 18;

      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;

      s.animate(
        [
          { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(.9)`, opacity: 0 }
        ],
        { duration: 520, easing: "cubic-bezier(.16,.95,.24,1)" }
      ).onfinish = () => s.remove();
    }
  }
}

// =========================================================
// EVENTOS: Modal
// =========================================================
function bindModalEvents() {
  document.getElementById("modalBackdrop")?.addEventListener("click", closeModal);
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modalCancel")?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("productModal");
    if (!modal || modal.classList.contains("hidden")) return;
    if (e.key === "Escape") closeModal();
  });

  document.getElementById("modalConfirm")?.addEventListener("click", (e) => {
    if (!modalSku || !selectedSize) return;

    // Se por algum motivo cair aqui no "EM-BREVE", ignora
    if (String(modalSku || "").toUpperCase() === SOON_SKU) return;

    const product = PRODUCTS.find((p) => String(p.sku || "").toUpperCase() === String(modalSku || "").toUpperCase());
    if (!product) return;

    const isAcaiSimples =
      String(product.category || "").toUpperCase() === "ACAI" &&
      String(product.sku || "").toUpperCase() === "ACAI-SIMPLES";

    const basePrice = getBasePrice(product, selectedSize);
    const total = calcModalTotal(product);

    Storage.addToCart({
      sku: product.sku,
      name: isAcaiSimples ? "Açaí" : product.name,
      category: product.category,
      size: selectedSize,
      basePrice,

      addons:
        product.category === "SALADA"
          ? Array.from(selectedAddons).map((k) => {
              const a = SALADA_ADDONS.find((x) => x.key === k);
              return { key: k, label: a?.label || k, price: Number(a?.price || 0) };
            })
          : product.category === "ACAI"
            ? Array.from(selectedAddons).map((k) => {
                const a = ACAI_ADDONS.find((x) => x.key === k);
                return { key: k, label: a?.label || k, price: Number(a?.price || 0) };
              })
            : [],

      addonsPrice: null,
      sucoPrep: product.category === "SUCO" ? selectedSucoPrep : null,
      sucoSugar: product.category === "SUCO" ? selectedSucoSugar : null,
      total
    });

    Storage.updateCartBadge();
    animateAddToCart(e.currentTarget);
    closeModal();
  });
}

// =========================================================
// FILTROS + DRAWER
// =========================================================
function bindSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("input", () => {
    searchTerm = input.value || "";
    renderProducts();
  });
}

function bindCategoryChips() {
  const chips = document.querySelectorAll(".seg-btn[data-category]");

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.getAttribute("data-category") || "";

      chips.forEach((c) => {
        c.classList.remove("active", "is-all", "is-suco", "is-acai", "is-salada");
        c.setAttribute("aria-selected", "false");
      });

      chip.classList.add("active");
      chip.setAttribute("aria-selected", "true");

      if (activeCategory === "") chip.classList.add("is-all");
      if (activeCategory === "SUCO") chip.classList.add("is-suco");
      if (activeCategory === "ACAI") chip.classList.add("is-acai");
      if (activeCategory === "SALADA") chip.classList.add("is-salada");

      renderProducts();
    });
  });
}

function bindDrawer() {
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("backdrop");
  const openBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeDrawer");

  if (!drawer) return;

  function open() {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop?.classList.remove("hidden");
    openBtn?.setAttribute("aria-expanded", "true");
    closeBtn?.classList.remove("is-rotate");
  }

  function close() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop?.classList.add("hidden");
    openBtn?.setAttribute("aria-expanded", "false");

    if (closeBtn) {
      closeBtn.classList.remove("is-rotate");
      void closeBtn.offsetWidth;
      closeBtn.classList.add("is-rotate");
      setTimeout(() => closeBtn.classList.remove("is-rotate"), 220);
    }
  }

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
}

// =========================================================
// INIT
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
  Storage.updateCartBadge();
  bindDrawer();
  bindSearch();
  bindCategoryChips();
  bindModalEvents();

  try {
    await loadProducts();
  } catch (e) {
    console.error("[menu.js] Falha ao buscar produtos:", e);
    PRODUCTS = [];
  }

  window.PRODUCTS = PRODUCTS; // debug
  renderProducts();
});

/* =========================================================
   ACOMPANHAR PEDIDO (index.html)
   ========================================================= */
(function initFollowOrderButton() {
  const wrap = document.getElementById("followOrderWrap");
  const btn = document.getElementById("btnFollowOrder");
  if (!wrap || !btn) return;

  const API_BASE = "http://localhost:8080/api";
  const KEY_LAST = "fruttz:last_order_id";

  function getLastOrderId() {
    try { return localStorage.getItem(KEY_LAST); } catch { return null; }
  }

  function clearLastOrder() {
    try {
      localStorage.removeItem("fruttz:last_order_id");
      localStorage.removeItem("fruttz:last_txid");
    } catch {}
  }

  async function fetchOrder(id) {
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function refresh() {
    const id = getLastOrderId();

    if (!id) {
      wrap.classList.add("hidden");
      return;
    }

    const order = await fetchOrder(id);

    if (!order || !order.status) {
      clearLastOrder();
      wrap.classList.add("hidden");
      return;
    }

    const status = String(order.status).toUpperCase();

    if (status === "DELIVERED" || status === "CANCELLED") {
      clearLastOrder();
      wrap.classList.add("hidden");
      return;
    }

    wrap.classList.remove("hidden");
    btn.onclick = () => {
      window.location.href = `./success.html?id=${encodeURIComponent(id)}`;
    };
  }

  refresh().catch(() => wrap.classList.add("hidden"));

  setInterval(() => {
    refresh().catch(() => wrap.classList.add("hidden"));
  }, 4000);
})();