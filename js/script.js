const revealElements = document.querySelectorAll(".reveal");
const preloader = document.querySelector(".preloader");
const menuGrid = document.querySelector("#menu-grid");
const menuStatus = document.querySelector("#menu-status");
const categoryStrip = document.querySelector("#category-strip");
const floatingCart = document.querySelector("#floating-cart");
const cartCount = document.querySelector("#cart-count");
const cartModal = document.querySelector("#cart-modal");
const checkoutModal = document.querySelector("#checkout-modal");
const cartList = document.querySelector("#cart-list");
const cartTotal = document.querySelector("#cart-total");
const cartMessage = document.querySelector("#cart-message");
const checkoutButton = document.querySelector("#checkout-button");
const backToCartButton = document.querySelector("#back-to-cart");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutMessage = document.querySelector("#checkout-message");
const orderSummary = document.querySelector("#order-summary");
const customerNameInput = document.querySelector("#customer-name");
const tableNumberInput = document.querySelector("#table-number");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Troque pelo numero do WhatsApp do restaurante, com indicativo do pais.
const numeroTelefoneRestaurante = "244952685457";

let products = [];
let selectedCategory = "Todos";
let cart = {};

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

document.body.classList.add("is-loading");
window.scrollTo(0, 0);

function showElement(element) {
  const delay = element.dataset.delay || "0";
  element.style.setProperty("--delay", `${delay}ms`);
  element.classList.add("is-visible");
}

function showPageAnimation() {
  window.scrollTo(0, 0);
  revealElements.forEach(showElement);
}

function hidePreloader(callback) {
  if (!preloader) {
    document.body.classList.remove("is-loading");
    callback();
    return;
  }

  const loadingTime = reducedMotion ? 0 : 900;
  const revealDelay = reducedMotion ? 0 : 520;

  setTimeout(() => {
    preloader.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
    setTimeout(callback, revealDelay);
  }, loadingTime);
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character]));
}

function formatPrice(value) {
  const amount = Number(value || 0);
  return `${new Intl.NumberFormat("pt-AO").format(amount)} Kz`;
}

function setMenuStatus(message, type = "info") {
  if (!menuStatus) return;

  menuStatus.textContent = message;
  menuStatus.classList.toggle("is-error", type === "error");
  menuStatus.classList.toggle("is-hidden", !message);
}

function getProductCategory(product) {
  return product.categorias?.nome || "Outros";
}

function getCategories() {
  const categoryNames = products.map(getProductCategory);
  return ["Todos", ...new Set(categoryNames)];
}

function getVisibleProducts() {
  if (selectedCategory === "Todos") {
    return products;
  }

  return products.filter((product) => getProductCategory(product) === selectedCategory);
}

function renderCategories() {
  if (!categoryStrip) return;

  categoryStrip.innerHTML = getCategories().map((category) => `
    <button type="button" class="category-pill ${category === selectedCategory ? "active" : ""}" data-category="${escapeHTML(category)}">
      ${escapeHTML(category)}
    </button>
  `).join("");
}

function renderMenu() {
  if (!menuGrid) return;

  const visibleProducts = getVisibleProducts();

  if (!products.length) {
    menuGrid.innerHTML = "";
    setMenuStatus("Ainda nao ha produtos disponiveis no menu.");
    return;
  }

  if (!visibleProducts.length) {
    menuGrid.innerHTML = "";
    setMenuStatus("Nao ha produtos disponiveis nesta categoria.");
    return;
  }

  menuGrid.innerHTML = `
    <section class="menu-category" aria-label="${escapeHTML(selectedCategory)}">
      <div class="menu-category-title">
        <h3>${escapeHTML(selectedCategory)}</h3>
        <span>${visibleProducts.length} produto${visibleProducts.length === 1 ? "" : "s"}</span>
      </div>
      <div class="product-card-grid">
        ${visibleProducts.map(renderProductCard).join("")}
      </div>
    </section>
  `;

  setMenuStatus("");
}

function renderProductCard(product) {
  // Adicionamos style="width: 100%; height: 100%;" diretamente na imagem
  const image = product.imagem_url
    ? `<img src="${escapeHTML(product.imagem_url)}" 
            alt="${escapeHTML(product.nome)}" 
            loading="lazy" 
            style="width: 100%; height: 100%; object-fit: cover;">` 
    : "<span>Sem imagem</span>";

  return `
    <article class="menu-product-card">
      <div class="menu-product-image">${image}</div>
      <div class="menu-product-info">
        <strong>${escapeHTML(product.nome)}</strong>
        <p>${escapeHTML(product.descricao || "Produto Gelimo Gelados.")}</p>
        <div class="product-buy-row">
          <span>${formatPrice(product.preco)}</span>
          <button type="button" class="add-cart-button" data-add-product="${product.id}">Adicionar</button>
        </div>
      </div>
    </article>
  `;
}

function getCartItems() {
  return Object.values(cart)
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      ...item,
      subtotal: Number(item.preco || 0) * item.quantity,
    }));
}

function getCartQuantity() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

function getCartTotal() {
  return getCartItems().reduce((total, item) => total + item.subtotal, 0);
}

function updateCartCount() {
  const quantity = getCartQuantity();
  cartCount.textContent = quantity;
  floatingCart.classList.toggle("has-items", quantity > 0);
}

function addToCart(productId) {
  const product = products.find((item) => String(item.id) === String(productId));

  if (!product) return;

  const currentItem = cart[productId];

  cart[productId] = {
    ...product,
    quantity: currentItem ? currentItem.quantity + 1 : 1,
  };

  updateCartCount();
  renderCart();
}

function changeCartQuantity(productId, change) {
  if (!cart[productId]) return;

  cart[productId].quantity += change;

  if (cart[productId].quantity <= 0) {
    delete cart[productId];
  }

  updateCartCount();
  renderCart();
}

function renderCart() {
  const items = getCartItems();

  cartTotal.textContent = formatPrice(getCartTotal());
  cartMessage.textContent = "";

  if (!items.length) {
    cartList.innerHTML = '<p class="empty-cart">O carrinho ainda esta vazio.</p>';
    checkoutButton.disabled = true;
    return;
  }

  checkoutButton.disabled = false;
  cartList.innerHTML = items.map((item) => `
    <article class="cart-item">
      <div>
        <strong>${escapeHTML(item.nome)}</strong>
        <span>${formatPrice(item.preco)}</span>
      </div>
      <div class="quantity-control" aria-label="Quantidade de ${escapeHTML(item.nome)}">
        <button type="button" data-cart-minus="${item.id}" aria-label="Diminuir quantidade">-</button>
        <span>${item.quantity}</span>
        <button type="button" data-cart-plus="${item.id}" aria-label="Aumentar quantidade">+</button>
      </div>
    </article>
  `).join("");
}

function renderOrderSummary() {
  const items = getCartItems();

  orderSummary.innerHTML = `
    <div class="summary-list">
      ${items.map((item) => `
        <div class="summary-row">
          <span>${item.quantity}x ${escapeHTML(item.nome)}</span>
          <strong>${formatPrice(item.subtotal)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="summary-total">
      <span>Total a pagar</span>
      <strong>${formatPrice(getCartTotal())}</strong>
    </div>
  `;
}

function openModal(modal) {
  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal-overlay.is-open")) {
    document.body.classList.remove("modal-open");
  }
}

function buildWhatsAppMessage(customerName, tableNumber) {
  const items = getCartItems();
  const orderLines = items
    .map((item) => `- ${item.quantity}x ${item.nome} (${formatPrice(item.subtotal)})`)
    .join("\n");

  return `NOVO PEDIDO (MESA ${tableNumber})
-----------------------------
Cliente: ${customerName}

Pratos Solicitados:

${orderLines}

-----------------------------
Total a Pagar: ${formatPrice(getCartTotal())}`;
}

function sendOrder(customerName, tableNumber) {
  const mensagem = buildWhatsAppMessage(customerName, tableNumber);
  const urlWhatsApp =
    `https://api.whatsapp.com/send?phone=${numeroTelefoneRestaurante}&text=${encodeURIComponent(mensagem)}`;

  window.open(urlWhatsApp, "_self");
}

function validateCheckout() {
  const customerName = customerNameInput.value.trim();
  const tableNumber = Number(tableNumberInput.value);

  if (!customerName) {
    return "Informe o nome do cliente.";
  }

  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 16) {
    return "Informe uma mesa entre 1 e 16.";
  }

  return "";
}

async function loadPublicMenu() {
  if (!menuGrid || !menuStatus) return;

  if (!window.gelimoSupabase) {
    setMenuStatus("Nao foi possivel ligar ao menu agora. Tente novamente em instantes.", "error");
    return;
  }

  setMenuStatus("A carregar menu...");

  const { data, error } = await window.gelimoSupabase
    .from("produtos")
    .select("id, nome, descricao, preco, imagem_url, categorias(nome)")
    .eq("disponivel", true)
    .order("criado_em", { ascending: false });

  if (error) {
    setMenuStatus("Nao foi possivel carregar o menu agora. Tente novamente em instantes.", "error");
    return;
  }

  products = data || [];
  selectedCategory = "Todos";
  renderCategories();
  renderMenu();
}

categoryStrip?.addEventListener("click", (event) => {
  const category = event.target.dataset.category;

  if (!category) return;

  selectedCategory = category;
  renderCategories();
  renderMenu();
});

menuGrid?.addEventListener("click", (event) => {
  const productId = event.target.dataset.addProduct;

  if (productId) {
    addToCart(productId);
  }
});

floatingCart?.addEventListener("click", () => {
  renderCart();
  openModal(cartModal);
});

cartList?.addEventListener("click", (event) => {
  const plusId = event.target.dataset.cartPlus;
  const minusId = event.target.dataset.cartMinus;

  if (plusId) {
    changeCartQuantity(plusId, 1);
  }

  if (minusId) {
    changeCartQuantity(minusId, -1);
  }
});

checkoutButton?.addEventListener("click", () => {
  if (!getCartItems().length) {
    cartMessage.textContent = "Adicione pelo menos um produto.";
    return;
  }

  checkoutMessage.textContent = "";
  renderOrderSummary();
  closeModal(cartModal);
  openModal(checkoutModal);
});

backToCartButton?.addEventListener("click", () => {
  closeModal(checkoutModal);
  openModal(cartModal);
});

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const validationMessage = validateCheckout();

  if (validationMessage) {
    checkoutMessage.textContent = validationMessage;
    return;
  }

  sendOrder(customerNameInput.value.trim(), Number(tableNumberInput.value));
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(document.querySelector(`#${button.dataset.closeModal}`));
  });
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal(overlay);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  document.querySelectorAll(".modal-overlay.is-open").forEach(closeModal);
});

if (reducedMotion) {
  hidePreloader(showPageAnimation);
} else {
  window.addEventListener("load", () => {
    hidePreloader(showPageAnimation);
  });
}

window.addEventListener("load", () => {
  updateCartCount();
  renderCart();
  loadPublicMenu();
});
