const navItems = document.querySelectorAll("[data-view-target]");
const viewPanels = document.querySelectorAll("[data-view]");
const viewTitle = document.querySelector("#view-title");

const productForm = document.querySelector("#product-form");
const productIdInput = document.querySelector("#product-id");
const currentImageUrlInput = document.querySelector("#current-image-url");
const productNameInput = document.querySelector("#product-name");
const productCategorySelect = document.querySelector("#product-category");
const productPriceInput = document.querySelector("#product-price");
const productDescriptionInput = document.querySelector("#product-description");
const productImageInput = document.querySelector("#product-image");
const productAvailableInput = document.querySelector("#product-available");
const productSubmit = document.querySelector("#product-submit");
const productsList = document.querySelector("#products-list");
const recentProducts = document.querySelector("#recent-products");
const totalProducts = document.querySelector("#total-products");
const availableProducts = document.querySelector("#available-products");
const totalCategories = document.querySelector("#total-categories");
const imagePreview = document.querySelector("#image-preview");
const adminMessage = document.querySelector("#admin-message");
const adminGlobalMessage = document.querySelector("#admin-global-message");
const clearProductFormButton = document.querySelector("#clear-product-form");
const refreshProductsButton = document.querySelector("#refresh-products");
const logoutButton = document.querySelector("#logout-button");

const fallbackCategories = ["Copos", "Cascas", "Picoles", "Milk-shakes"];
const maxImageSize = 5 * 1024 * 1024;
const viewLabels = {
  dashboard: "Dashboard",
  add: "Adicionar produto",
  edit: "Editar produtos",
};

let categories = [];
let products = [];
let previewUrl = "";

function setMessage(message, type = "error") {
  adminMessage.textContent = message;
  adminMessage.classList.toggle("success", type === "success");
  adminGlobalMessage.textContent = message;
  adminGlobalMessage.classList.toggle("success", type === "success");
}

function getSupabaseErrorMessage(error, action) {
  const detail = error?.message || error?.details || error?.hint || "";
  const suffix = detail ? ` Detalhe: ${detail}` : "";

  if (detail.toLowerCase().includes("bucket not found")) {
    return "O bucket de imagens nao foi encontrado. Confirme se existe um bucket chamado produto-imagens no Supabase Storage.";
  }

  if (detail.toLowerCase().includes("row-level security") || detail.toLowerCase().includes("policy")) {
    return `Sem permissao no Supabase para ${action}. Verifique as policies de Storage/tabelas.${suffix}`;
  }

  if (error?.code === "42501" || error?.status === 401 || error?.status === 403) {
    return `Sem permissao no Supabase para ${action}. Verifique as politicas RLS das tabelas categorias e produtos.${suffix}`;
  }

  return `Nao foi possivel ${action}.${suffix}`;
}

function validateImageFile(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem valido.");
  }

  if (file.size > maxImageSize) {
    throw new Error("A imagem deve ter no maximo 5 MB.");
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
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

function createFileId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function switchView(viewName) {
  viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.view === viewName);
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.viewTarget === viewName);
  });

  viewTitle.textContent = viewLabels[viewName] || "Dashboard";
}

function checkSupabase() {
  if (!window.gelimoSupabase) {
    setMessage("Configure o Supabase em js/supabaseClient.js antes de usar o painel.");
    return false;
  }

  return true;
}

async function protectPage() {
  if (!checkSupabase()) {
    return false;
  }

  const { data } = await window.gelimoSupabase.auth.getSession();

  if (!data.session) {
    window.location.href = "loginAdm.html";
    return false;
  }

  return true;
}

async function loadCategories() {
  const { data, error } = await window.gelimoSupabase
    .from("categorias")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    setMessage(getSupabaseErrorMessage(error, "carregar as categorias"));
    renderCategoryOptions();
    return;
  }

  categories = data || [];
  renderCategoryOptions();
  renderDashboard();
}

async function loadProducts() {
  const { data, error } = await window.gelimoSupabase
    .from("produtos")
    .select("*, categorias(nome)")
    .order("criado_em", { ascending: false });

  if (error) {
    setMessage(getSupabaseErrorMessage(error, "carregar os produtos"));
    return;
  }

  products = data || [];
  renderProducts();
  renderDashboard();
}

function renderCategoryOptions() {
  const selectedValue = productCategorySelect.value;
  const existingNames = new Set(categories.map((category) => category.nome.toLowerCase()));

  productCategorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category.id;
    option.textContent = category.nome;
    productCategorySelect.appendChild(option);
  });

  fallbackCategories.forEach((categoryName) => {
    if (existingNames.has(categoryName.toLowerCase())) return;

    const option = document.createElement("option");

    option.value = `fake:${categoryName}`;
    option.textContent = categoryName;
    productCategorySelect.appendChild(option);
  });

  productCategorySelect.value = selectedValue;
}

function renderDashboard() {
  totalProducts.textContent = products.length;
  availableProducts.textContent = products.filter((product) => product.disponivel).length;
  totalCategories.textContent = categories.length || fallbackCategories.length;

  const recent = products.slice(0, 4);

  if (!recent.length) {
    recentProducts.innerHTML = '<p class="empty-state">Nenhum produto cadastrado ainda.</p>';
    return;
  }

  recentProducts.innerHTML = recent.map((product) => renderProductItem(product, false)).join("");
}

function renderProducts() {
  if (!products.length) {
    productsList.innerHTML = '<p class="empty-state">Nenhum produto cadastrado ainda. Use Adicionar para criar o primeiro produto.</p>';
    return;
  }

  productsList.innerHTML = products.map((product) => renderProductItem(product, true)).join("");
}

function renderProductItem(product, showActions) {
  const image = product.imagem_url
    ? `<img src="${escapeHTML(product.imagem_url)}" alt="${escapeHTML(product.nome)}">`
    : "Sem imagem";
  const availableLabel = product.disponivel ? "Disponivel" : "Indisponivel";
  const actions = showActions
    ? `<div class="product-actions">
        <button type="button" class="product-action" data-product-edit="${product.id}">Editar</button>
        <button type="button" class="product-action" data-product-toggle="${product.id}">
          ${product.disponivel ? "Ocultar" : "Disponivel"}
        </button>
        <button type="button" class="product-action danger" data-product-delete="${product.id}">Apagar</button>
      </div>`
    : "";

  return `
    <article class="product-item">
      <div class="product-image">${image}</div>
      <div class="product-info">
        <strong>${escapeHTML(product.nome)}</strong>
        <p>${escapeHTML(product.descricao || "Sem descricao.")}</p>
        <div class="product-meta">
          <span class="badge">${formatPrice(product.preco)}</span>
          <span class="badge">${escapeHTML(product.categorias?.nome || "Sem categoria")}</span>
          <span class="badge ${product.disponivel ? "" : "off"}">${availableLabel}</span>
        </div>
      </div>
      ${actions}
    </article>
  `;
}

function clearImagePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  imagePreview.classList.remove("has-image");
  imagePreview.innerHTML = "<span>Nenhuma imagem selecionada</span>";
}

function setImagePreview(src, alt = "Imagem selecionada") {
  imagePreview.classList.add("has-image");
  imagePreview.innerHTML = `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}">`;
}

function resetProductForm() {
  productForm.reset();
  productIdInput.value = "";
  currentImageUrlInput.value = "";
  productAvailableInput.checked = true;
  productSubmit.textContent = "Salvar produto";
  clearImagePreview();
  setMessage("");
}

function editProduct(productId) {
  const product = products.find((item) => item.id === productId);

  if (!product) return;

  productIdInput.value = product.id;
  currentImageUrlInput.value = product.imagem_url || "";
  productNameInput.value = product.nome || "";
  productCategorySelect.value = product.categoria_id || "";
  productPriceInput.value = product.preco || "";
  productDescriptionInput.value = product.descricao || "";
  productAvailableInput.checked = Boolean(product.disponivel);
  productSubmit.textContent = "Atualizar produto";

  clearImagePreview();

  if (product.imagem_url) {
    setImagePreview(product.imagem_url, product.nome);
  }

  switchView("add");
}

async function getCategoryIdForSave() {
  const selectedValue = productCategorySelect.value;

  if (!selectedValue.startsWith("fake:")) {
    return selectedValue;
  }

  const nome = selectedValue.replace("fake:", "");
  const { data, error } = await window.gelimoSupabase
    .from("categorias")
    .insert({ nome })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(getSupabaseErrorMessage(error, "criar a categoria selecionada"));
  }

  await loadCategories();
  return data.id;
}

async function uploadProductImage(file) {
  validateImageFile(file);

  const extension = file.name.split(".").pop();
  const fileName = `${createFileId()}.${extension}`;
  const filePath = `produtos/${fileName}`;
  const bucketName = window.PRODUCT_IMAGES_BUCKET || "produto-imagens";

  const { error } = await window.gelimoSupabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(getSupabaseErrorMessage(error, "enviar a imagem"));
  }

  const { data } = window.gelimoSupabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    switchView(item.dataset.viewTarget);
  });
});

productImageInput.addEventListener("change", () => {
  const file = productImageInput.files[0];

  clearImagePreview();

  if (!file) return;

  try {
    validateImageFile(file);
  } catch (error) {
    productImageInput.value = "";
    setMessage(error.message);
    return;
  }

  previewUrl = URL.createObjectURL(file);
  setImagePreview(previewUrl, file.name);
  setMessage("");
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const productId = productIdInput.value;
  const imageFile = productImageInput.files[0];

  productSubmit.disabled = true;
  productSubmit.textContent = productId ? "A atualizar..." : "A salvar...";
  setMessage("A salvar produto...");

  try {
    const categoryId = await getCategoryIdForSave();
    const imageUrl = imageFile
      ? await uploadProductImage(imageFile)
      : currentImageUrlInput.value || null;

    const payload = {
      nome: productNameInput.value.trim(),
      categoria_id: categoryId,
      preco: Number(productPriceInput.value),
      descricao: productDescriptionInput.value.trim(),
      imagem_url: imageUrl,
      disponivel: productAvailableInput.checked,
    };

    const query = productId
      ? window.gelimoSupabase.from("produtos").update(payload).eq("id", productId)
      : window.gelimoSupabase.from("produtos").insert(payload);

    const { error } = await query;

    if (error) {
      throw new Error(getSupabaseErrorMessage(error, "salvar o produto"));
    }

    resetProductForm();
    setMessage("Produto salvo com sucesso.", "success");
    await loadProducts();
    switchView("edit");
  } catch (error) {
    setMessage(error.message);
  } finally {
    productSubmit.disabled = false;
    productSubmit.textContent = productIdInput.value ? "Atualizar produto" : "Salvar produto";
  }
});

productsList.addEventListener("click", async (event) => {
  const editId = event.target.dataset.productEdit;
  const toggleId = event.target.dataset.productToggle;
  const deleteId = event.target.dataset.productDelete;

  if (editId) {
    editProduct(editId);
  }

  if (toggleId) {
    const product = products.find((item) => item.id === toggleId);

    if (!product) return;

    const { error } = await window.gelimoSupabase
      .from("produtos")
      .update({ disponivel: !product.disponivel })
      .eq("id", toggleId);

    if (error) {
      setMessage(getSupabaseErrorMessage(error, "mudar a disponibilidade"));
      return;
    }

    setMessage("Disponibilidade atualizada.", "success");
    await loadProducts();
  }

  if (deleteId) {
    const canDelete = confirm("Apagar este produto?");

    if (!canDelete) return;

    const { error } = await window.gelimoSupabase.from("produtos").delete().eq("id", deleteId);

    if (error) {
      setMessage(getSupabaseErrorMessage(error, "apagar o produto"));
      return;
    }

    setMessage("Produto apagado.", "success");
    await loadProducts();
  }
});

recentProducts.addEventListener("click", (event) => {
  const editId = event.target.dataset.productEdit;

  if (editId) {
    editProduct(editId);
  }
});

clearProductFormButton.addEventListener("click", resetProductForm);
refreshProductsButton.addEventListener("click", async () => {
  await loadCategories();
  await loadProducts();
});

logoutButton.addEventListener("click", async () => {
  if (window.gelimoSupabase) {
    await window.gelimoSupabase.auth.signOut();
  }

  window.location.href = "loginAdm.html";
});

window.addEventListener("load", async () => {
  const canOpen = await protectPage();

  if (!canOpen) return;

  await loadCategories();
  await loadProducts();
});
