// ui-templates.js — SOMENTE templates HTML (centraliza todo o HTML do projeto)
// -----------------------------------------------------------------------------
// Objetivo:
// - Manter os arquivos *.js "limpos" (somente lógica / eventos / API).
// - Todo HTML em string (innerHTML / template literal com tags) fica aqui.
// - NÃO renomeia IDs/classes: os seletores do seu CSS/JS continuam funcionando.
// -----------------------------------------------------------------------------
// Como usar:
// - Garanta que ui-templates.js é importado ANTES dos demais scripts:
//   <script src="./js/ui-templates.js"></script>
//   <script src="./js/menu.js"></script> ...
// -----------------------------------------------------------------------------

(function () {
  "use strict";

  /* =========================================================
     SAFE HTML
     ---------------------------------------------------------
     Escape básico para evitar quebrar o DOM quando vier texto
     com caracteres especiais (& < > " ').
     Use SEMPRE para valores vindos do backend/usuário.
     ========================================================= */
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================================================
     MENU (Cardápio)
     ========================================================= */

  // Card vazio (“Nenhum item encontrado”)
  // Mantém o mesmo layout que você já usava no menu.js.
  function menuEmpty() {
    return `
      <div class="card" style="justify-content:flex-start;">
        <div>
          <h3>Nenhum item encontrado</h3>
          <p style="margin:0;color:var(--muted);font-weight:700;font-size:13px;">
            Tente outra busca ou selecione uma categoria diferente.
          </p>
        </div>
      </div>
    `;
  }

  // Card de produto do cardápio (mesma estrutura do cardTemplate antigo)
  function menuCard({ sku, name, desc, tagClass, tagLabel, tags = [], fromPriceText }) {
    const tagsHtml = (tags || [])
      .slice(0, 2)
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");

    return `
      <article class="card">
        <div style="min-width:0;">
          <h3>${escapeHtml(name)}</h3>

          <div class="meta">
            <span class="tag ${escapeHtml(tagClass)}">${escapeHtml(tagLabel)}</span>
            ${tagsHtml}
          </div>

          <p style="margin:0;color:var(--muted);font-weight:700;font-size:13px;line-height:1.35;">
            ${escapeHtml(desc)}
          </p>

          <div class="price">${
            String(sku || "").toUpperCase() === "EM-BREVE"
              ? escapeHtml(fromPriceText) // fica só "Em breve"
              : `A partir de ${escapeHtml(fromPriceText)}`
          }</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
          ${
            String(sku || "").toUpperCase() === "EM-BREVE"
              ? ``
              : `<button class="btn btn-primary js-open-modal" data-sku="${escapeHtml(sku)}">Adicionar</button>`
          }
        </div>
      </article>
    `;
  }

  // Linhas da tabela nutricional (<tbody>)
  function nutritionRows(rows = []) {
    return (rows || [])
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join("");
  }

  // Item de adicional (checkbox) dentro do modal do cardápio
  function modalAddonItem({ key, label, priceText }) {
    return `
      <label class="addon-item">
        <span class="addon-left">
          <input class="switch js-addon" type="checkbox" data-addon="${escapeHtml(key)}">
          <span class="addon-name">${escapeHtml(label)}</span>
        </span>
        <span class="addon-price">+ ${escapeHtml(priceText)}</span>
      </label>
    `;
  }

  // Bloco “Tamanho” (injetado no modal quando necessário)
  function modalSizeBlock() {
    return `
      <p class="modal-section-title" style="margin-bottom:8px;">Tamanho</p>
      <div id="sizeOptions" class="chips" style="gap:10px;"></div>
    `;
  }

  // Bloco “Preparo / Açúcar” (somente para SUCO)
  function modalSucoBlock() {
    return `
      <p class="modal-section-title" style="margin-bottom:8px;">Preparo</p>
      <div id="sucoPrepOptions" class="chips" style="gap:10px;margin-bottom:10px;"></div>

      <p class="modal-section-title" style="margin-bottom:8px;">Açúcar</p>
      <div id="sucoSugarOptions" class="chips" style="gap:10px;"></div>
    `;
  }

  /* =========================================================
     CART (Carrinho)
     ========================================================= */

  // Card do item no carrinho (já estava centralizado aqui)
  function cartItem({ id, name, optionsText, showAddonsHint, hintText, unitText, lineText, qty }) {
    return `
      <article class="card cart-item">
        <div class="cart-main">
          <h3 class="cart-title">${escapeHtml(name || "Item")}</h3>

          <p class="cart-item-sub">${escapeHtml(optionsText || "")}</p>

          ${showAddonsHint ? `<p class="cart-addon-hint">${escapeHtml(hintText)}</p>` : ""}

          <div class="cart-prices">
            <div class="cart-price">
              <span class="cart-price-label">Valor</span>
              <strong class="cart-price-value cart-price-unit">${escapeHtml(unitText)}</strong>
            </div>

            <div class="cart-price">
              <span class="cart-price-label">Valor total</span>
              <strong class="cart-price-value cart-price-total">${escapeHtml(lineText)}</strong>
            </div>
          </div>
        </div>

        <div class="cart-actions">
          <div class="qty">
            <button class="qty-btn qty-btn-minus js-qty-minus" data-id="${escapeHtml(id)}" type="button" aria-label="Diminuir">−</button>

            <input
              class="qty-input js-qty-input"
              data-id="${escapeHtml(id)}"
              type="number"
              min="1"
              step="1"
              value="${escapeHtml(qty)}"
              inputmode="numeric"
              aria-label="Quantidade"
            />

            <button class="qty-btn qty-btn-plus js-qty-plus" data-id="${escapeHtml(id)}" type="button" aria-label="Aumentar">+</button>
          </div>

          <button class="btn btn-secondary js-remove" data-id="${escapeHtml(id)}" type="button">Remover</button>
        </div>
      </article>
    `;
  }

  /* =========================================================
     CHECKOUT — Pix Modal + (antigo) Inline Success
     ========================================================= */

  // Conteúdo do modal Pix (sem estilos inline; o CSS fica no checkout.css)
  function checkoutPixModal() {
    return `
      <div class="pix-head">
        <div>
          <div class="pix-title" id="pixTitle">Pagar com Pix</div>
          <div class="pix-sub" id="pixSubtitle">Use o “copia e cola” no seu banco</div>
        </div>
        <button id="pixClose" class="pix-x" aria-label="Fechar">✕</button>
      </div>

      <div class="pix-body">
        <div class="pix-label">Código Pix (copia e cola)</div>
        <textarea id="pixCode" readonly></textarea>

        <div class="pix-actions">
          <button id="pixCopy" class="pix-btn pix-btn-green pix-btn-fluid">Copiar código</button>
          <button id="pixDone" class="pix-btn pix-btn-pink">Fechar</button>
        </div>

        <div class="pix-actions pix-dev-row" id="pixDevRow">
          <button id="pixSimPay" class="pix-btn pix-btn-dark pix-btn-fluid">
            Simular pagamento (DEV)
          </button>
        </div>

        <div id="pixMeta"></div>
      </div>
    `;
  }

  // Parte “meta” do Pix (Pedido / TXID / Status)
  function checkoutPixMeta({ isPaid, prettyOrder, txid, status }) {
    const paidBadge = isPaid ? `<div class="pix-paid">✅ Pago</div>` : "";
    return `
      ${paidBadge}
      <div><b>Pedido:</b> ${escapeHtml(prettyOrder)}</div>
      <div><b>TXID:</b> ${escapeHtml(txid)}</div>
      <div><b>Status:</b> ${escapeHtml(status)}</div>
      <div class="pix-note">
        *Pagamento ainda é “mock” (na próxima fase integra PSP/banco e confirma automático).
      </div>
    `;
  }

  // Modal antigo de “Inline Success”
  function checkoutInlineSuccess() {
    return `
      <div class="s-accent" aria-hidden="true"></div>

      <div class="s-inner" role="dialog" aria-modal="true" aria-label="Pedido confirmado">
        <div class="s-head">
          <div>
            <h2 class="s-title">Pedido confirmado</h2>
            <p class="s-sub" id="fruttzSuccessSub">Pagamento confirmado. Você pode acompanhar o preparo do pedido.</p>
          </div>

          <div class="s-right">
            <div class="s-badge" id="fruttzSuccessStatus">PAGO</div>
          </div>
        </div>

        <div class="s-kv">
          <div class="s-row">
            <div class="s-k">Pedido</div>
            <div class="s-v" id="fruttzSuccessOrderId">—</div>
          </div>

          <div class="s-row">
            <div class="s-k">TXID</div>
            <div class="s-v" id="fruttzSuccessTxid">—</div>
          </div>
        </div>

        <div class="s-actions">
          <button class="btn-like btn-ghost" id="fruttzSuccessDetails" type="button">Ver detalhes</button>
          <button class="btn-like btn-green" id="fruttzSuccessGoMenu" type="button">Voltar ao cardápio</button>
        </div>
      </div>
    `;
  }

  /* =========================================================
     COMANDA (Painel da loja)
     ========================================================= */

  function comandaOrderCard({
    id,
    title,
    sub1,
    sub2,
    sub3,
    pillClass,
    statusLabel,
    totalText,
    shippingText,
    subtotalText,
    statusText,
    isOpen,
    canAdvance,
    nextLabel,
  }) {
    return `
      <div class="order-card" data-id="${escapeHtml(id)}">
        <div class="order-top">
          <div>
            <div class="order-title">${escapeHtml(title)}</div>
            <div class="order-sub">${escapeHtml(sub1)}<br>${escapeHtml(sub2)}${sub3 ? `<br>${escapeHtml(sub3)}` : ``}</div>
          </div>
          <div class="pill ${escapeHtml(pillClass)}">${escapeHtml(statusLabel)}</div>
        </div>

        <div class="order-kv">
          <div class="kv-row2">
            <span>Total</span>
            <div class="mono">${escapeHtml(totalText)}</div>
          </div>
          <div class="kv-row2">
            <span>Frete</span>
            <div class="mono">${escapeHtml(shippingText)}</div>
          </div>
          <div class="kv-row2">
            <span>Subtotal</span>
            <div class="mono">${escapeHtml(subtotalText)}</div>
          </div>
          <div class="kv-row2">
            <span>Status</span>
            <div class="mono">${escapeHtml(statusText)}</div>
          </div>
        </div>

        <div class="order-actions">
          <button class="btn-like btn-ghost" type="button" data-action="toggle">
            ${isOpen ? "Ocultar itens" : "Ver itens"}
          </button>
          <button class="btn-like btn-green" type="button" data-action="open">Abrir pedido</button>
          <button class="btn-like btn-ghost" type="button" data-action="advance" ${canAdvance ? "" : "disabled"}
            title="Avançar para ${escapeHtml(nextLabel)}">
            Avançar (${escapeHtml(nextLabel)})
          </button>
        </div>

        <div class="details ${isOpen ? "is-on" : ""}" id="details-${escapeHtml(id)}">
          <div class="items" id="items-${escapeHtml(id)}">
            <div class="item"><small>${isOpen ? "Carregando itens…" : ""}</small></div>
          </div>
        </div>
      </div>
    `;
  }

  function comandaItemsError(msg) {
    return `<div class="item"><small>Erro: ${escapeHtml(msg)}</small></div>`;
  }

  function comandaItemsEmpty() {
    return `<div class="item"><small>Sem itens.</small></div>`;
  }

  // ✅ ALTERADO: remove "chip-row-end" que empurrava chips para posição errada
  function comandaAddonsChips(labels = []) {
    const list = (labels || [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    if (!list.length) return `<span class="muted-dash">—</span>`;

    return `
      <div class="chip-row">
        ${list.map((l) => `<span class="addon-chip">${escapeHtml(l)}</span>`).join("")}
      </div>
    `;
  }

  // ✅ ALTERADO: permite inserir HTML (chips) sem escapar e sem forçar "mono"
  function comandaKvRow({ label, valueHtml, strong, isHtml = false, valueClass = "" }) {
    return `
      <div class="kv-row">
        <small class="kv-label ${strong ? "kv-label-strong" : ""}">
          ${escapeHtml(label)}
        </small>
        <small class="kv-value ${strong ? "kv-value-strong" : ""} ${escapeHtml(valueClass)}">
          ${isHtml ? valueHtml : escapeHtml(valueHtml)}
        </small>
      </div>
    `;
  }

  // ✅ ALTERADO: "Adicionais" vira linha KV normal (chips ficam no lugar certo)
  function comandaOrderItem({ title, subtotalText, addonsHtml }) {
    return `
      <div class="order-item">
        <div class="order-item-title">${escapeHtml(title)}</div>

        <div class="order-item-grid">
          ${comandaKvRow({
            label: "Subtotal",
            valueHtml: subtotalText,
            strong: false,
            isHtml: false,
            valueClass: "mono",
          })}

          ${comandaKvRow({
            label: "Adicionais",
            valueHtml: addonsHtml,
            strong: false,
            isHtml: true,
            valueClass: "kv-value-chips",
          })}
        </div>
      </div>
    `;
  }

  function comandaItemsWrapper({ itemsHtml, shippingText, totalText }) {
    return `
      <div class="item">
        ${itemsHtml}

        <div class="divider-soft"></div>

        <div class="order-totals">
          ${comandaKvRow({ label: "Frete", valueHtml: shippingText, strong: false, isHtml: false, valueClass: "mono" })}
          ${comandaKvRow({ label: "Total (com frete)", valueHtml: totalText, strong: true, isHtml: false, valueClass: "mono" })}
        </div>
      </div>
    `;
  }

  /* =========================================================
     EXPORT
     ========================================================= */
  window.TPL = Object.assign(window.TPL || {}, {
    // utils
    escapeHtml,

    // menu
    menuEmpty,
    menuCard,
    nutritionRows,
    modalAddonItem,
    modalSizeBlock,
    modalSucoBlock,

    // cart
    cartItem,

    // checkout
    checkoutPixModal,
    checkoutPixMeta,
    checkoutInlineSuccess,

    // comanda
    comandaOrderCard,
    comandaItemsError,
    comandaItemsEmpty,
    comandaAddonsChips,
    comandaKvRow,
    comandaOrderItem,
    comandaItemsWrapper,
  });
})();