// drawer.js — abre/fecha o menu lateral (drawer) em qualquer página

function bindDrawer() {
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("backdrop");
  const openBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeDrawer");

  // Se a página não tiver drawer, não faz nada (não quebra o resto)
  if (!drawer || !openBtn || !closeBtn || !backdrop) return;

  function open() {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");

    backdrop.classList.remove("hidden");
    backdrop.removeAttribute("hidden");

    openBtn.setAttribute("aria-expanded", "true");
    closeBtn.classList.remove("is-rotate");
  }

  function close() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");

    backdrop.classList.add("hidden");
    backdrop.setAttribute("hidden", "");

    openBtn.setAttribute("aria-expanded", "false");

    // animação do X (opcional)
    closeBtn.classList.remove("is-rotate");
    void closeBtn.offsetWidth; // reflow
    closeBtn.classList.add("is-rotate");
    setTimeout(() => closeBtn.classList.remove("is-rotate"), 220);
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  // Fechar no ESC
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!drawer.classList.contains("open")) return;
    close();
  });
}

document.addEventListener("DOMContentLoaded", bindDrawer);
