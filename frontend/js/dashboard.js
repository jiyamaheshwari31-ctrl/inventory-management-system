// ============================================================
// AUTH CHECK
// ============================================================

if (!getToken()) {
    window.location.href = "index.html";
}


// ============================================================
// USER INFORMATION
// ============================================================

const user = JSON.parse(localStorage.getItem("user") || "{}");

const userName = user.name || "User";
const userRole = user.role || "Staff";

document.getElementById("welcome-name").textContent = userName;
document.getElementById("sidebar-user-name").textContent = userName;
document.getElementById("sidebar-user-role").textContent = userRole;

const initials = userName
    .split(" ")
    .map(word => word.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();

document.getElementById("top-avatar").textContent = initials;
document.getElementById("sidebar-user-avatar").textContent = initials;


// ============================================================
// GLOBAL STATE
// ============================================================

let suppliersCache = [];
let productsCache = [];
let allProductsCache = [];
let salesCache = [];

let currentSaleItems = [];

let currentProductPage = 1;
const pageSize = 5;

let currentProductSearch = "";
let currentSupplierSearch = "";
let currentSalesSearch = "";


// ============================================================
// HELPERS
// ============================================================

function formatCurrency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showToast(message, type = "success") {

    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <span class="toast-icon">
            ${type === "success" ? "✓" : "!"}
        </span>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-hide");

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 3000);
}


function getErrorMessage(error) {

    if (error && error.message) {
        return error.message;
    }

    return "Something went wrong. Please try again.";
}


// ============================================================
// LOGOUT
// ============================================================

document.getElementById("logout-btn").addEventListener("click", () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "index.html";
});


// ============================================================
// TABS / SIDEBAR NAVIGATION
// ============================================================

document.querySelectorAll(".sidebar-link").forEach((button) => {

    button.addEventListener("click", () => {

        const tabName = button.dataset.tab;

        document.querySelectorAll(".sidebar-link")
            .forEach(btn => btn.classList.remove("active"));

        document.querySelectorAll(".tab-content")
            .forEach(section => section.classList.add("hidden"));

        button.classList.add("active");

        document
            .getElementById(`tab-${tabName}`)
            .classList.remove("hidden");

        const titles = {
            products: "Products",
            suppliers: "Suppliers",
            sales: "Sales"
        };

        document.getElementById("page-title").textContent = titles[tabName];
        document.getElementById("current-section").textContent = titles[tabName];
    });
});


// ============================================================
// DASHBOARD SUMMARY
// ============================================================

async function loadSummary() {

    try {

        const data = await apiRequest("/dashboard/summary");

        const totalProducts = Number(data.total_products || 0);
        const totalSales = Number(data.total_sales || 0);
        const totalRevenue = Number(data.total_revenue || 0);
        const lowStockProducts = data.low_stock_products || [];

        document.getElementById("summary-cards").innerHTML = `

            <div class="summary-card">
                <div class="summary-icon">▦</div>
                <div>
                    <span>Total Products</span>
                    <strong>${totalProducts}</strong>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon">↗</div>
                <div>
                    <span>Total Sales</span>
                    <strong>${totalSales}</strong>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon">₹</div>
                <div>
                    <span>Total Revenue</span>
                    <strong>${formatCurrency(totalRevenue)}</strong>
                </div>
            </div>

            <div class="summary-card warning-card">
                <div class="summary-icon">!</div>
                <div>
                    <span>Low Stock Items</span>
                    <strong>${lowStockProducts.length}</strong>
                </div>
            </div>
        `;


        const alertBox = document.getElementById("low-stock-alert");

        if (lowStockProducts.length > 0) {

            alertBox.classList.remove("hidden");

            alertBox.innerHTML = `
                <strong>⚠ Low stock alert</strong>
                <span>
                    ${lowStockProducts
                        .map(p =>
                            `${escapeHTML(p.name)} (${p.quantity} left)`
                        )
                        .join(", ")}
                </span>
            `;

        } else {

            alertBox.classList.add("hidden");
            alertBox.innerHTML = "";
        }

    } catch (error) {

        showToast(getErrorMessage(error), "error");
    }
}


// ============================================================
// SUPPLIERS
// ============================================================

async function loadSuppliers() {

    try {

        suppliersCache = await apiRequest("/suppliers");

        renderSuppliers();

        updateSupplierDropdown();

    } catch (error) {

        showToast(getErrorMessage(error), "error");
    }
}


function renderSuppliers() {

    const tbody = document.querySelector("#suppliers-table tbody");
    const emptyState = document.getElementById("suppliers-empty");

    const search = currentSupplierSearch.toLowerCase().trim();

    const filtered = suppliersCache.filter(supplier => {

        const name = String(supplier.name || "").toLowerCase();
        const phone = String(supplier.phone || "").toLowerCase();
        const email = String(supplier.email || "").toLowerCase();

        return (
            name.includes(search) ||
            phone.includes(search) ||
            email.includes(search)
        );
    });


    document.getElementById("supplier-count").textContent =
        `${filtered.length} supplier${filtered.length !== 1 ? "s" : ""}`;


    if (!filtered.length) {

        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");

        return;
    }

    emptyState.classList.add("hidden");


    tbody.innerHTML = filtered.map(s => `

        <tr>

            <td>#${s.supplier_id}</td>

            <td>
                <div class="table-primary">
                    ${escapeHTML(s.name)}
                </div>
            </td>

            <td>${escapeHTML(s.phone || "-")}</td>

            <td>${escapeHTML(s.email || "-")}</td>

            <td>

                <div class="action-buttons">

                    <button
                        class="small edit"
                        data-action="edit-supplier"
                        data-id="${s.supplier_id}"
                    >
                        Edit
                    </button>

                    <button
                        class="small delete"
                        data-action="delete-supplier"
                        data-id="${s.supplier_id}"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>

    `).join("");
}


function updateSupplierDropdown() {

    const select = document.getElementById("p-supplier");

    select.innerHTML = `
        <option value="">No supplier</option>
        ${suppliersCache.map(s => `
            <option value="${s.supplier_id}">
                ${escapeHTML(s.name)}
            </option>
        `).join("")}
    `;
}


// Supplier search

document.getElementById("supplier-search-btn")
    .addEventListener("click", () => {

        currentSupplierSearch =
            document.getElementById("supplier-search").value;

        renderSuppliers();
    });


document.getElementById("supplier-search")
    .addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            currentSupplierSearch =
                event.target.value;

            renderSuppliers();
        }
    });


// Supplier form

document.getElementById("supplier-form")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const id =
            document.getElementById("supplier-id").value;

        const payload = {

            name:
                document.getElementById("s-name").value.trim(),

            phone:
                document.getElementById("s-phone").value.trim(),

            email:
                document.getElementById("s-email").value.trim()
        };


        try {

            if (id) {

                await apiRequest(
                    `/suppliers/${id}`,
                    "PUT",
                    payload
                );

                showToast("Supplier updated successfully.");

            } else {

                await apiRequest(
                    "/suppliers",
                    "POST",
                    payload
                );

                showToast("Supplier added successfully.");
            }


            resetSupplierForm();

            await loadSuppliers();

        } catch (error) {

            showToast(getErrorMessage(error), "error");
        }
    });


// Edit supplier

function editSupplier(id) {

    const supplier =
        suppliersCache.find(
            s => Number(s.supplier_id) === Number(id)
        );

    if (!supplier) return;


    document.getElementById("supplier-id").value =
        supplier.supplier_id;

    document.getElementById("s-name").value =
        supplier.name || "";

    document.getElementById("s-phone").value =
        supplier.phone || "";

    document.getElementById("s-email").value =
        supplier.email || "";


    document.getElementById("supplier-form-title")
        .textContent = "Edit Supplier";

    document.getElementById("supplier-submit-text")
        .textContent = "Update Supplier";

    document.getElementById("supplier-submit-icon")
        .textContent = "✓";

    document.getElementById("supplier-cancel-btn")
        .classList.remove("hidden");
}


// Delete supplier

async function deleteSupplier(id) {

    if (!confirm("Delete this supplier?")) {
        return;
    }


    try {

        await apiRequest(
            `/suppliers/${id}`,
            "DELETE"
        );

        showToast("Supplier deleted successfully.");

        await Promise.all([
            loadSuppliers(),
            loadProducts(1, currentProductSearch)
        ]);

    } catch (error) {

        showToast(getErrorMessage(error), "error");
    }
}


// Reset supplier form

function resetSupplierForm() {

    document.getElementById("supplier-form").reset();

    document.getElementById("supplier-id").value = "";

    document.getElementById("supplier-form-title")
        .textContent = "Add Supplier";

    document.getElementById("supplier-submit-text")
        .textContent = "Add Supplier";

    document.getElementById("supplier-submit-icon")
        .textContent = "＋";

    document.getElementById("supplier-cancel-btn")
        .classList.add("hidden");
}


document.getElementById("supplier-cancel-btn")
    .addEventListener("click", resetSupplierForm);


// Supplier table event delegation

document.querySelector("#suppliers-table tbody")
    .addEventListener("click", (event) => {

        const button =
            event.target.closest("button[data-action]");

        if (!button) return;

        const id = Number(button.dataset.id);
        const action = button.dataset.action;

        if (action === "edit-supplier") {
            editSupplier(id);
        }

        if (action === "delete-supplier") {
            deleteSupplier(id);
        }
    });


// ============================================================
// PRODUCTS
// ============================================================

async function loadProducts(page = 1, search = "") {

    try {

        currentProductPage = page;
        currentProductSearch = search;


        const query =
            new URLSearchParams({
                page: page,
                limit: pageSize,
                search: search
            }).toString();


        const data =
            await apiRequest(`/products?${query}`);


        productsCache = data.items || [];


        renderProducts(data);


    } catch (error) {

        showToast(getErrorMessage(error), "error");
    }
}


function renderProducts(data) {

    const tbody =
        document.querySelector("#products-table tbody");

    const emptyState =
        document.getElementById("products-empty");


    const products =
        data.items || [];


    document.getElementById("product-count").textContent =
        `${data.total || products.length} product${(data.total || products.length) !== 1 ? "s" : ""}`;


    if (!products.length) {

        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");

    } else {

        emptyState.classList.add("hidden");


        tbody.innerHTML = products.map(p => {

            const supplier =
                suppliersCache.find(
                    s =>
                        Number(s.supplier_id) ===
                        Number(p.supplier_id)
                );


            const lowStock =
                Boolean(p.low_stock);


            return `

                <tr class="${lowStock ? "low-stock-row" : ""}">

                    <td>#${p.product_id}</td>

                    <td>
                        <div class="table-primary">
                            ${escapeHTML(p.name)}
                        </div>
                    </td>

                    <td>
                        ${escapeHTML(p.category || "-")}
                    </td>

                    <td>
                        ${formatCurrency(p.price)}
                    </td>

                    <td>
                        <strong>${p.quantity}</strong>
                    </td>

                    <td>
                        ${escapeHTML(supplier?.name || "-")}
                    </td>

                    <td>

                        <span class="status-badge ${lowStock ? "status-low" : "status-good"}">
                            ${lowStock ? "Low Stock" : "In Stock"}
                        </span>

                    </td>

                    <td>

                        <div class="action-buttons">

                            <button
                                class="small edit"
                                data-action="edit-product"
                                data-id="${p.product_id}"
                            >
                                Edit
                            </button>

                            <button
                                class="small delete"
                                data-action="delete-product"
                                data-id="${p.product_id}"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        }).join("");
    }


    renderPagination(data);
}


// Pagination

function renderPagination(data) {

    const container =
        document.getElementById("products-pagination");


    const pages =
        Number(data.pages || 1);

    const current =
        Number(data.page || currentProductPage);


    if (pages <= 1) {

        container.innerHTML = "";
        return;
    }


    let html = "";


    html += `
        <button
            class="page-btn"
            ${current === 1 ? "disabled" : ""}
            data-page="${current - 1}"
        >
            ‹
        </button>
    `;


    for (let i = 1; i <= pages; i++) {

        html += `
            <button
                class="page-btn ${i === current ? "active" : ""}"
                data-page="${i}"
            >
                ${i}
            </button>
        `;
    }


    html += `
        <button
            class="page-btn"
            ${current === pages ? "disabled" : ""}
            data-page="${current + 1}"
        >
            ›
        </button>
    `;


    container.innerHTML = html;
}


document.getElementById("products-pagination")
    .addEventListener("click", (event) => {

        const button =
            event.target.closest(".page-btn");

        if (!button || button.disabled) return;

        const page =
            Number(button.dataset.page);

        loadProducts(
            page,
            document.getElementById("product-search").value
        );
    });


// Product search

document.getElementById("search-btn")
    .addEventListener("click", () => {

        const search =
            document.getElementById("product-search").value.trim();

        loadProducts(1, search);
    });


document.getElementById("product-search")
    .addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            loadProducts(
                1,
                event.target.value.trim()
            );
        }
    });


// Product form

document.getElementById("product-form")
    .addEventListener("submit", async (event) => {

        event.preventDefault();


        const id =
            document.getElementById("product-id").value;


        const payload = {

            name:
                document.getElementById("p-name").value.trim(),

            category:
                document.getElementById("p-category").value.trim(),

            price:
                parseFloat(
                    document.getElementById("p-price").value
                ),

            quantity:
                parseInt(
                    document.getElementById("p-quantity").value,
                    10
                ),

            supplier_id:
                document.getElementById("p-supplier").value
                    ? parseInt(
                        document.getElementById("p-supplier").value,
                        10
                    )
                    : null
        };


        if (
            !payload.name ||
            Number.isNaN(payload.price) ||
            Number.isNaN(payload.quantity)
        ) {

            showToast(
                "Please enter valid product details.",
                "error"
            );

            return;
        }


        try {

            if (id) {

                await apiRequest(
                    `/products/${id}`,
                    "PUT",
                    payload
                );

                showToast("Product updated successfully.");

            } else {

                await apiRequest(
                    "/products",
                    "POST",
                    payload
                );

                showToast("Product added successfully.");
            }


            resetProductForm();


            await Promise.all([
                loadProducts(currentProductPage, currentProductSearch),
                loadAllProductsForSaleDropdown(),
                loadSummary()
            ]);

        } catch (error) {

            showToast(getErrorMessage(error), "error");
        }
    });


// Edit product

function editProduct(id) {

    const product =
        productsCache.find(
            p =>
                Number(p.product_id) ===
                Number(id)
        );


    if (!product) return;


    document.getElementById("product-id").value =
        product.product_id;

    document.getElementById("p-name").value =
        product.name || "";

    document.getElementById("p-category").value =
        product.category || "";

    document.getElementById("p-price").value =
        product.price;

    document.getElementById("p-quantity").value =
        product.quantity;

    document.getElementById("p-supplier").value =
        product.supplier_id || "";


    document.getElementById("product-form-title")
        .textContent = "Edit Product";

    document.getElementById("product-submit-text")
        .textContent = "Update Product";

    document.getElementById("product-submit-icon")
        .textContent = "✓";

    document.getElementById("product-cancel-btn")
        .classList.remove("hidden");
}


// Delete product

async function deleteProduct(id) {

    if (!confirm("Delete this product?")) {
        return;
    }


    try {

        await apiRequest(
            `/products/${id}`,
            "DELETE"
        );

        showToast("Product deleted successfully.");


        await Promise.all([
            loadProducts(
                currentProductPage,
                currentProductSearch
            ),
            loadAllProductsForSaleDropdown(),
            loadSummary()
        ]);

    } catch (error) {

        showToast(getErrorMessage(error), "error");
    }
}


// Reset product form

function resetProductForm() {

    document.getElementById("product-form").reset();

    document.getElementById("product-id").value = "";

    document.getElementById("product-form-title")
        .textContent = "Add Product";

    document.getElementById("product-submit-text")
        .textContent = "Add Product";

    document.getElementById("product-submit-icon")
        .textContent = "＋";

    document.getElementById("product-cancel-btn")
        .classList.add("hidden");
}


document.getElementById("product-cancel-btn")
    .addEventListener("click", resetProductForm);


// Product table event delegation

document.querySelector("#products-table tbody")
    .addEventListener("click", (event) => {

        const button =
            event.target.closest("button[data-action]");

        if (!button) return;

        const id = Number(button.dataset.id);
        const action = button.dataset.action;

        if (action === "edit-product") {
            editProduct(id);
        }

        if (action === "delete-product") {
            deleteProduct(id);
        }
    });


// ============================================================
// FULL PRODUCT LIST FOR SALES DROPDOWN
// ============================================================

async function loadAllProductsForSaleDropdown() {

    try {

        const data =
            await apiRequest("/products?limit=1000");


        allProductsCache =
            data.items || [];


        const saleSelect =
            document.getElementById("sale-product");


        if (!allProductsCache.length) {

            saleSelect.innerHTML =
                `<option value="">No products available</option>`;

            saleSelect.disabled = true;

            return;
        }


        saleSelect.disabled = false;


        saleSelect.innerHTML = allProductsCache.map(p => `

            <option value="${p.product_id}">

                ${escapeHTML(p.name)}
                (stock: ${p.quantity})

            </option>

        `).join("");

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


// ============================================================
// SALES
// ============================================================

document.getElementById("add-item-btn")
    .addEventListener("click", () => {

        const productId =
            parseInt(
                document.getElementById("sale-product").value,
                10
            );


        const quantity =
            parseInt(
                document.getElementById("sale-qty").value,
                10
            );


        const product =
            allProductsCache.find(
                p =>
                    Number(p.product_id) ===
                    Number(productId)
            );


        if (!product) {

            showToast(
                "Please select a product.",
                "error"
            );

            return;
        }


        if (!Number.isInteger(quantity) || quantity < 1) {

            showToast(
                "Quantity must be at least 1.",
                "error"
            );

            return;
        }


        const existing =
            currentSaleItems.find(
                item =>
                    Number(item.product_id) ===
                    Number(productId)
            );


        const existingQuantity =
            existing ? existing.quantity : 0;


        if (
            existingQuantity + quantity >
            Number(product.quantity)
        ) {

            showToast(
                `Only ${product.quantity} units of ${product.name} are available.`,
                "error"
            );

            return;
        }


        if (existing) {

            existing.quantity += quantity;

        } else {

            currentSaleItems.push({

                product_id: product.product_id,

                quantity: quantity,

                name: product.name,

                price: Number(product.price)
            });
        }


        renderSaleItems();


        document.getElementById("sale-qty").value = 1;
    });


function renderSaleItems() {

    const list =
        document.getElementById("sale-items-list");


    const count =
        document.getElementById("sale-item-count");


    const total =
        document.getElementById("sale-total");


    count.textContent =
        `${currentSaleItems.length} item${currentSaleItems.length !== 1 ? "s" : ""}`;


    if (!currentSaleItems.length) {

        list.innerHTML = `
            <li class="sale-empty">
                No items added yet.
            </li>
        `;

        total.textContent = "₹0.00";

        return;
    }


    list.innerHTML =
        currentSaleItems.map((item, index) => `

            <li class="sale-item">

                <div class="sale-item-info">

                    <strong>
                        ${escapeHTML(item.name)}
                    </strong>

                    <span>
                        ${formatCurrency(item.price)}
                        × ${item.quantity}
                    </span>

                </div>

                <div class="sale-item-total">
                    ${formatCurrency(item.price * item.quantity)}
                </div>

                <button
                    type="button"
                    class="remove-sale-item"
                    data-index="${index}"
                >
                    ×
                </button>

            </li>

        `).join("");


    const saleTotal =
        currentSaleItems.reduce(
            (sum, item) =>
                sum +
                (Number(item.price) * Number(item.quantity)),
            0
        );


    total.textContent =
        formatCurrency(saleTotal);
}


// Remove sale item

document.getElementById("sale-items-list")
    .addEventListener("click", (event) => {

        const button =
            event.target.closest(".remove-sale-item");

        if (!button) return;

        const index =
            Number(button.dataset.index);

        currentSaleItems.splice(index, 1);

        renderSaleItems();
    });


// Submit sale

document.getElementById("submit-sale-btn")
    .addEventListener("click", async () => {

        if (!currentSaleItems.length) {

            showToast(
                "Add at least one item before completing the sale.",
                "error"
            );

            return;
        }


        try {

            await apiRequest(
                "/sales",
                "POST",
                {
                    items:
                        currentSaleItems.map(item => ({
                            product_id: item.product_id,
                            quantity: item.quantity
                        }))
                }
            );


            showToast("Sale recorded successfully.");


            currentSaleItems = [];

            renderSaleItems();


            await Promise.all([
                loadProducts(
                    currentProductPage,
                    currentProductSearch
                ),
                loadAllProductsForSaleDropdown(),
                loadSales(),
                loadSummary()
            ]);

        } catch (error) {

            showToast(
                getErrorMessage(error),
                "error"
            );
        }
    });


// ============================================================
// SALES HISTORY
// ============================================================

async function loadSales() {

    try {

        salesCache =
            await apiRequest("/sales");


        renderSales();

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


function renderSales() {

    const tbody =
        document.querySelector("#sales-table tbody");

    const emptyState =
        document.getElementById("sales-empty");


    const search =
        currentSalesSearch.toLowerCase().trim();


    const filtered =
        salesCache.filter(sale => {

            const id =
                String(sale.sale_id || "").toLowerCase();

            return id.includes(search);
        });


    if (!filtered.length) {

        tbody.innerHTML = "";

        emptyState.classList.remove("hidden");

        return;
    }


    emptyState.classList.add("hidden");


    tbody.innerHTML =
        filtered.map(s => `

            <tr>

                <td>#${s.sale_id}</td>

                <td>
                    ${new Date(s.date).toLocaleString()}
                </td>

                <td>
                    <strong>
                        ${formatCurrency(s.total_amount)}
                    </strong>
                </td>

                <td>
                    ${s.items && s.items.length
                        ? s.items.map(i =>
                            `${escapeHTML(
                                i.name ||
                                `Product #${i.product_id}`
                            )} ×${i.quantity}`
                        ).join(", ")
                        : "-"
                    }
                </td>

            </tr>

        `).join("");
}


// Sales search

document.getElementById("sales-search-btn")
    .addEventListener("click", () => {

        currentSalesSearch =
            document.getElementById("sales-search").value;

        renderSales();
    });


document.getElementById("sales-search")
    .addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            currentSalesSearch =
                event.target.value;

            renderSales();
        }
    });


// ============================================================
// CSV EXPORT
// ============================================================

async function downloadCSV(path, filename) {

    try {

        const response =
            await fetch(
                `${API_BASE}${path}`,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${getToken()}`
                    }
                }
            );


        if (!response.ok) {

            let message = "Export failed.";

            try {

                const data =
                    await response.json();

                message =
                    data.error || message;

            } catch (_) {}

            throw new Error(message);
        }


        const blob =
            await response.blob();


        const url =
            window.URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;
        link.download = filename;

        document.body.appendChild(link);

        link.click();

        link.remove();


        window.URL.revokeObjectURL(url);


        showToast(
            `${filename} downloaded successfully.`
        );

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


// Product CSV

document.getElementById("export-products-btn")
    .addEventListener("click", () => {

        downloadCSV(
            "/dashboard/export/products",
            "products_report.csv"
        );
    });


// Sales CSV

document.getElementById("export-sales-btn")
    .addEventListener("click", () => {

        downloadCSV(
            "/dashboard/export/sales",
            "sales_report.csv"
        );
    });


// ============================================================
// INITIALIZATION
// ============================================================

(async function init() {

    try {

        await loadSuppliers();

        await loadProducts(
            1,
            ""
        );

        await loadAllProductsForSaleDropdown();

        await loadSales();

        await loadSummary();

        renderSaleItems();

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }

})();

