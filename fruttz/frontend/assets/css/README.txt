FRUTTZ — CSS ORGANIZADO

Estrutura:
- styles.css                -> bundle principal (cardápio/carrinho/checkout)
- core/base.css             -> variáveis + resets + layout base
- core/components.css       -> componentes compartilhados
- core/ui-inline.css        -> estilos que saíram do JS
- pages/menu.css            -> cardápio
- pages/cart.css            -> carrinho
- pages/checkout.css        -> checkout + pix modal + inline success
- pages/success.css         -> página de acompanhamento/sucesso (opcional)
- admin/comanda.css         -> painel admin (comanda)
- styles-success.css        -> bundle opcional para success.html
- styles-comanda.css        -> bundle opcional para comanda.html

Como usar:
1) Troque seu link atual para apontar para este styles.css (ou copie os arquivos para sua pasta /css).
2) Garanta que seus HTML continuem com as mesmas classes/ids — nada foi renomeado.
3) Ajustes de responsividade foram adicionados APENAS em media queries (max-width 520/420/360).
