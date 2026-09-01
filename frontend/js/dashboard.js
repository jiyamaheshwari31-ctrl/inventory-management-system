if (!getToken()) window.location.href = "index.html";

const user = JSON.parse(localStorage.getItem("user") || "{}");
document.getElementById("welcome").textContent = `Hi, ${user.name || ""} (${user.role || ""})`;

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
  });
});

let suppliersCache = [];
let productsCache = [];
let currentSaleItems = [];

// ---------- Dashboard summary ----------
async function loadSummary() {
  const data = await apiRequest("/api/dashboard/summary");
  document.getElementById("summary-cards").innerHTML = `
    <div class="card"><h3>Total Products</h3><p>${data.total_products}</p></div>
    <div class="card"><h3>Total Sales</h3><p>${data.total_sales}</p></div>
    <div class="card"><h3>Revenue</h3><p>₹${data.total_revenue.toFixed(2)}</p></div>
    <div class="card"><h3>Low Stock Items</h3><p>${data.low_stock_products.length}</p></div>
  `;
  const alertBox = document.getElementById("low-stock-alert");
  if (data.low_stock_products.length) {
    alertBox.classList.remove("hidden");
    alertBox.textContent = "⚠ Low stock: " + data.low_stock_products.map((p) => `${p.name} (${p.quantity})`).join(", ");
  } else {
    alertBox.classList.add("hidden");
  }
}

// ---------- Suppliers ----------
async function loadSuppliers() {
  suppliersCache = await apiRequest("/api/suppliers");
  const tbody = document.querySelector("#suppliers-table tbody");
  tbody.innerHTML = suppliersCache.map((s) => `
    <tr>
      <td>${s.supplier_id}</td><td>${s.name}</td><td>${s.phone || ""}</td><td>${s.email || ""}</td>
      <td>
        <button class="small edit" onclick="editSupplier(${s.supplier_id})">Edit</button>
        <button class="small delete" onclick="deleteSupplier(${s.supplier_id})">Delete</button>
      </td>
    </tr>`).join("");

  const supplierSelect = document.getElementById("p-supplier");
  supplierSelect.innerHTML = `<option value="">No supplier</option>` +
    suppliersCache.map((s) => `<option value="${s.supplier_id}">${s.name}</option>`).join("");
}

document.getElementById("supplier-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("supplier-id").value;
  const payload = {
    name: document.getElementById("s-name").value,
    phone: document.getElementById("s-phone").value,
    email: document.getElementById("s-email").value,
  };
  if (id) await apiRequest(`/suppliers/${id}`, "PUT", payload);
  else await apiRequest("/suppliers", "POST", payload);
  e.target.reset();
  document.getElementById("supplier-id").value = "";
  await loadSuppliers();
});

window.editSupplier = (id) => {
  const s = suppliersCache.find((x) => x.supplier_id === id);
  document.getElementById("supplier-id").value = s.supplier_id;
  document.getElementById("s-name").value = s.name;
  document.getElementById("s-phone").value = s.phone || "";
  document.getElementById("s-email").value = s.email || "";
};

window.deleteSupplier = async (id) => {
  if (!confirm("Delete this supplier?")) return;
  await apiRequest(`/suppliers/${id}`, "DELETE");
  await loadSuppliers();
};

// ---------- Products ----------
async function loadProducts() {
  productsCache = await apiRequest("/api/products");
  const tbody = document.querySelector("#products-table tbody");
  tbody.innerHTML = productsCache.map((p) => `
    <tr style="${p.low_stock ? 'background:#fff7ed' : ''}">
      <td>${p.product_id}</td><td>${p.name}</td><td>${p.category || ""}</td>
      <td>₹${p.price.toFixed(2)}</td><td>${p.quantity}</td>
      <td>${suppliersCache.find((s) => s.supplier_id === p.supplier_id)?.name || "-"}</td>
      <td>
        <button class="small edit" onclick="editProduct(${p.product_id})">Edit</button>
        <button class="small delete" onclick="deleteProduct(${p.product_id})">Delete</button>
      </td>
    </tr>`).join("");

  const saleSelect = document.getElementById("sale-product");
  saleSelect.innerHTML = productsCache.map((p) => `<option value="${p.product_id}">${p.name} (stock: ${p.quantity})</option>`).join("");
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("product-id").value;
  const payload = {
    name: document.getElementById("p-name").value,
    category: document.getElementById("p-category").value,
    price: parseFloat(document.getElementById("p-price").value),
    quantity: parseInt(document.getElementById("p-quantity").value, 10),
    supplier_id: document.getElementById("p-supplier").value || null,
  };
  if (id) await apiRequest(`/products/${id}`, "PUT", payload);
  else await apiRequest("/products", "POST", payload);
  e.target.reset();
  document.getElementById("product-id").value = "";
  await Promise.all([loadProducts(), loadSummary()]);
});

window.editProduct = (id) => {
  const p = productsCache.find((x) => x.product_id === id);
  document.getElementById("product-id").value = p.product_id;
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-category").value = p.category || "";
  document.getElementById("p-price").value = p.price;
  document.getElementById("p-quantity").value = p.quantity;
  document.getElementById("p-supplier").value = p.supplier_id || "";
};

window.deleteProduct = async (id) => {
  if (!confirm("Delete this product?")) return;
  await apiRequest(`/products/${id}`, "DELETE");
  await Promise.all([loadProducts(), loadSummary()]);
};

// ---------- Sales ----------
document.getElementById("add-item-btn").addEventListener("click", () => {
  const productId = parseInt(document.getElementById("sale-product").value, 10);
  const qty = parseInt(document.getElementById("sale-qty").value, 10);
  const product = productsCache.find((p) => p.product_id === productId);
  if (!product || qty < 1) return;
  currentSaleItems.push({ product_id: productId, quantity: qty, name: product.name });
  renderSaleItems();
});

function renderSaleItems() {
  document.getElementById("sale-items-list").innerHTML = currentSaleItems
    .map((i, idx) => `<li>${i.name} x ${i.quantity} <button class="small delete" onclick="removeSaleItem(${idx})">x</button></li>`)
    .join("");
}

window.removeSaleItem = (idx) => {
  currentSaleItems.splice(idx, 1);
  renderSaleItems();
};

document.getElementById("submit-sale-btn").addEventListener("click", async () => {
  if (!currentSaleItems.length) return alert("Add at least one item");
  await apiRequest("/sales", "POST", {
    items: currentSaleItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
  });
  currentSaleItems = [];
  renderSaleItems();
  await Promise.all([loadProducts(), loadSales(), loadSummary()]);
});

async function loadSales() {
  const sales = await apiRequest("/api/sales");
  document.querySelector("#sales-table tbody").innerHTML = sales.map((s) => `
    <tr>
      <td>${s.sale_id}</td>
      <td>${new Date(s.date).toLocaleString()}</td>
      <td>₹${s.total_amount.toFixed(2)}</td>
      <td>${s.items.map((i) => `#${i.product_id} x${i.quantity}`).join(", ")}</td>
    </tr>`).join("");
}

// ---------- Init ----------
(async function init() {
  await loadSuppliers();
  await loadProducts();
  await loadSales();
  await loadSummary();
})();
