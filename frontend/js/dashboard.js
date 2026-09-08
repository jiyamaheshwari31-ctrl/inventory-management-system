// ============================================================
// AUTH CHECK
// ============================================================

if (!getToken()) {
    window.location.href = "index.html";
}


// ============================================================
// USER INFORMATION
// ============================================================

const user = JSON.parse(
    localStorage.getItem("user") || "{}"
);

const userName = user.name || "User";
const userRole = user.role || "Staff";

document.getElementById("welcome-name").textContent = userName;
document.getElementById("sidebar-user-name").textContent = userName;
document.getElementById("sidebar-user-role").textContent = userRole;

const initials = userName
    .split(" ")
    .filter(Boolean)
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


function getErrorMessage(error) {
    return error && error.message
        ? error.message
        : "Something went wrong. Please try again.";
}


function showToast(message, type = "success") {

    const container =
        document.getElementById("toast-container");

    const toast =
        document.createElement("div");

    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span>
            ${type === "success" ? "✓" : "!"}
        </span>

        <span>
            ${escapeHTML(message)}
        </span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}


// ============================================================
// LOGOUT
// ============================================================

document
    .getElementById("logout-btn")
    .addEventListener("click", () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "index.html";
    });


// ============================================================
// SIDEBAR NAVIGATION
// ============================================================

document
    .querySelectorAll(".sidebar-link")
    .forEach(button => {

        button.addEventListener("click", () => {

            const tabName =
                button.dataset.tab;

            document
                .querySelectorAll(".sidebar-link")
                .forEach(btn =>
                    btn.classList.remove("active")
                );

            document
                .querySelectorAll(".tab-content")
                .forEach(section =>
                    section.classList.add("hidden")
                );

            button.classList.add("active");

            document
                .getElementById(`tab-${tabName}`)
                .classList.remove("hidden");

            const titles = {
                products: "Products",
                suppliers: "Suppliers",
                sales: "Sales"
            };

            document.getElementById(
                "page-title"
            ).textContent = titles[tabName];

            document.getElementById(
                "current-section"
            ).textContent = titles[tabName];

        });

    });


// ============================================================
// SUMMARY
// ============================================================

async function loadSummary() {

    try {

        const data =
            await apiRequest("/dashboard/summary");

        const totalProducts =
            Number(data.total_products || 0);

        const totalSales =
            Number(data.total_sales || 0);

        const totalRevenue =
            Number(data.total_revenue || 0);

        const lowStockProducts =
            data.low_stock_products || [];


        document.getElementById(
            "summary-cards"
        ).innerHTML = `

            <div class="summary-card">

                <div class="summary-top">

                    <span class="summary-label">
                        TOTAL PRODUCTS
                    </span>

                    <div class="summary-icon">
                        ▦
                    </div>

                </div>

                <div class="summary-value">
                    ${totalProducts}
                </div>

                <div class="summary-description">
                    Products currently in catalogue
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-top">

                    <span class="summary-label">
                        TOTAL SALES
                    </span>

                    <div class="summary-icon">
                        ↗
                    </div>

                </div>

                <div class="summary-value">
                    ${totalSales}
                </div>

                <div class="summary-description">
                    Completed transactions
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-top">

                    <span class="summary-label">
                        TOTAL REVENUE
                    </span>

                    <div class="summary-icon">
                        ₹
                    </div>

                </div>

                <div class="summary-value">
                    ${formatCurrency(totalRevenue)}
                </div>

                <div class="summary-description">
                    Revenue generated from sales
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-top">

                    <span class="summary-label">
                        LOW STOCK
                    </span>

                    <div class="summary-icon">
                        !
                    </div>

                </div>

                <div class="summary-value">
                    ${lowStockProducts.length}
                </div>

                <div class="summary-description">
                    Products requiring attention
                </div>

            </div>

        `;


        const alertBox =
            document.getElementById(
                "low-stock-alert"
            );


        if (lowStockProducts.length > 0) {

            alertBox.classList.remove("hidden");

            alertBox.innerHTML = `

                <div class="alert-icon">
                    !
                </div>

                <div>

                    <strong>
                        Low stock alert
                    </strong>

                    <span>
                        ${lowStockProducts
                            .map(p =>
                                `${escapeHTML(p.name)}
                                 (${p.quantity} left)`
                            )
                            .join(", ")
                        }
                    </span>

                </div>

            `;

        } else {

            alertBox.classList.add("hidden");
            alertBox.innerHTML = "";

        }

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


// ============================================================
// SUPPLIERS
// ============================================================

async function loadSuppliers() {

    try {

        suppliersCache =
            await apiRequest("/suppliers");

        renderSuppliers();
        updateSupplierDropdown();

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


function renderSuppliers() {

    const tbody =
        document.querySelector(
            "#suppliers-table tbody"
        );

    const emptyState =
        document.getElementById(
            "suppliers-empty"
        );

    const search =
        currentSupplierSearch
            .toLowerCase()
            .trim();


    const filtered =
        suppliersCache.filter(supplier => {

            const name =
                String(
                    supplier.name || ""
                ).toLowerCase();

            const phone =
                String(
                    supplier.phone || ""
                ).toLowerCase();

            const email =
                String(
                    supplier.email || ""
                ).toLowerCase();

            return (
                name.includes(search) ||
                phone.includes(search) ||
                email.includes(search)
            );

        });


    document.getElementById(
        "supplier-count"
    ).textContent =
        `${filtered.length} supplier${
            filtered.length !== 1
                ? "s"
                : ""
        }`;


    if (!filtered.length) {

        tbody.innerHTML = "";

        emptyState.classList.remove(
            "hidden"
        );

        return;
    }


    emptyState.classList.add(
        "hidden"
    );


    tbody.innerHTML =
        filtered.map(supplier => `

            <tr>

                <td>
                    #${supplier.supplier_id}
                </td>


                <td>

                    <div class="product-name-cell">

                        <div class="product-mini-icon">
                            ${escapeHTML(
                                (supplier.name || "S")
                                    .charAt(0)
                                    .toUpperCase()
                            )}
                        </div>

                        <div class="product-name-text">

                            <strong>
                                ${escapeHTML(
                                    supplier.name
                                )}
                            </strong>

                            <span>
                                Supplier
                            </span>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(
                        supplier.phone || "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        supplier.email || "—"
                    )}
                </td>


                <td>

                    <div class="action-buttons">

                        <button
                            class="action-btn edit"
                            data-action="edit-supplier"
                            data-id="${supplier.supplier_id}"
                            type="button"
                        >
                            Edit
                        </button>

                        <button
                            class="action-btn delete"
                            data-action="delete-supplier"
                            data-id="${supplier.supplier_id}"
                            type="button"
                        >
                            Delete
                        </button>

                    </div>

                </td>

            </tr>

        `).join("");
}


function updateSupplierDropdown() {

    const select =
        document.getElementById(
            "p-supplier"
        );

    select.innerHTML = `

        <option value="">
            No supplier
        </option>

        ${suppliersCache
            .map(supplier => `

                <option
                    value="${supplier.supplier_id}"
                >
                    ${escapeHTML(
                        supplier.name
                    )}
                </option>

            `)
            .join("")
        }

    `;
}


// Supplier search
document
    .getElementById("supplier-search-btn")
    .addEventListener("click", () => {

        currentSupplierSearch =
            document.getElementById(
                "supplier-search"
            ).value;

        renderSuppliers();
    });


document
    .getElementById("supplier-search")
    .addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            currentSupplierSearch =
                event.target.value;

            renderSuppliers();
        }

    });


// Supplier form
document
    .getElementById("supplier-form")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                document.getElementById(
                    "supplier-id"
                ).value;


            const payload = {

                name:
                    document.getElementById(
                        "s-name"
                    ).value.trim(),

                phone:
                    document.getElementById(
                        "s-phone"
                    ).value.trim(),

                email:
                    document.getElementById(
                        "s-email"
                    ).value.trim()

            };


            if (!payload.name) {

                showToast(
                    "Supplier name is required.",
                    "error"
                );

                return;
            }


            try {

                if (id) {

                    await apiRequest(
                        `/suppliers/${id}`,
                        "PUT",
                        payload
                    );

                    showToast(
                        "Supplier updated successfully."
                    );

                } else {

                    await apiRequest(
                        "/suppliers",
                        "POST",
                        payload
                    );

                    showToast(
                        "Supplier added successfully."
                    );

                }


                resetSupplierForm();

                await Promise.all([
                    loadSuppliers(),
                    loadProducts(
                        currentProductPage,
                        currentProductSearch
                    )
                ]);

            } catch (error) {

                showToast(
                    getErrorMessage(error),
                    "error"
                );

            }

        }
    );


// Edit supplier
function editSupplier(id) {

    const supplier =
        suppliersCache.find(
            s =>
                Number(s.supplier_id) ===
                Number(id)
        );

    if (!supplier) return;


    document.getElementById(
        "supplier-id"
    ).value =
        supplier.supplier_id;


    document.getElementById(
        "s-name"
    ).value =
        supplier.name || "";


    document.getElementById(
        "s-phone"
    ).value =
        supplier.phone || "";


    document.getElementById(
        "s-email"
    ).value =
        supplier.email || "";


    document.getElementById(
        "supplier-form-title"
    ).textContent =
        "Edit Supplier";


    document.getElementById(
        "supplier-submit-text"
    ).textContent =
        "Update Supplier";


    document.getElementById(
        "supplier-submit-icon"
    ).textContent =
        "✓";


    document.getElementById(
        "supplier-cancel-btn"
    ).classList.remove(
        "hidden"
    );


    document
        .getElementById("s-name")
        .focus();

}


// Delete supplier
async function deleteSupplier(id) {

    if (
        !confirm(
            "Delete this supplier?"
        )
    ) {
        return;
    }


    try {

        await apiRequest(
            `/suppliers/${id}`,
            "DELETE"
        );

        showToast(
            "Supplier deleted successfully."
        );


        await Promise.all([
            loadSuppliers(),
            loadProducts(
                1,
                currentProductSearch
            )
        ]);

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


// Reset supplier form
function resetSupplierForm() {

    document
        .getElementById("supplier-form")
        .reset();

    document.getElementById(
        "supplier-id"
    ).value = "";


    document.getElementById(
        "supplier-form-title"
    ).textContent =
        "Add Supplier";


    document.getElementById(
        "supplier-submit-text"
    ).textContent =
        "Add Supplier";


    document.getElementById(
        "supplier-submit-icon"
    ).textContent =
        "＋";


    document.getElementById(
        "supplier-cancel-btn"
    ).classList.add(
        "hidden"
    );
}


document
    .getElementById(
        "supplier-cancel-btn"
    )
    .addEventListener(
        "click",
        resetSupplierForm
    );


// Supplier table events
document
    .querySelector(
        "#suppliers-table tbody"
    )
    .addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) return;


            const id =
                Number(button.dataset.id);

            const action =
                button.dataset.action;


            if (
                action ===
                "edit-supplier"
            ) {
                editSupplier(id);
            }


            if (
                action ===
                "delete-supplier"
            ) {
                deleteSupplier(id);
            }

        }
    );


// ============================================================
// PRODUCTS
// ============================================================

async function loadProducts(
    page = 1,
    search = ""
) {

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
            await apiRequest(
                `/products?${query}`
            );


        productsCache =
            data.items || [];


        renderProducts(data);


    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


async function loadAllProductsForSaleDropdown() {

    try {

        const data =
            await apiRequest(
                "/products?limit=1000"
            );


        allProductsCache =
            data.items || [];


        renderSaleProductOptions();

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


function renderProducts(data) {

    const tbody =
        document.querySelector(
            "#products-table tbody"
        );

    const emptyState =
        document.getElementById(
            "products-empty"
        );


    const products =
        data.items || [];


    const total =
        Number(
            data.total ||
            products.length
        );


    document.getElementById(
        "product-count"
    ).textContent =
        `${total} product${
            total !== 1
                ? "s"
                : ""
        }`;


    if (!products.length) {

        tbody.innerHTML = "";

        emptyState.classList.remove(
            "hidden"
        );

        renderPagination({
            pages: 1,
            page: 1
        });

        return;

    }


    emptyState.classList.add(
        "hidden"
    );


    tbody.innerHTML =
        products.map(product => {

            const supplier =
                suppliersCache.find(
                    s =>
                        Number(
                            s.supplier_id
                        ) ===
                        Number(
                            product.supplier_id
                        )
                );


            let stockClass =
                "stock-good";

            let stockText =
                "In stock";


            if (
                Number(
                    product.quantity
                ) <= 0
            ) {

                stockClass =
                    "stock-out";

                stockText =
                    "Out of stock";

            } else if (
                product.low_stock
            ) {

                stockClass =
                    "stock-low";

                stockText =
                    "Low stock";

            }


            return `

                <tr>

                    <td>
                        #${product.product_id}
                    </td>


                    <td>

                        <div class="product-name-cell">

                            <div class="product-mini-icon">
                                ${escapeHTML(
                                    (
                                        product.name ||
                                        "P"
                                    )
                                    .charAt(0)
                                    .toUpperCase()
                                )}
                            </div>

                            <div class="product-name-text">

                                <strong>
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </strong>

                                <span>
                                    Product #${product.product_id}
                                </span>

                            </div>

                        </div>

                    </td>


                    <td>
                        ${escapeHTML(
                            product.category ||
                            "Uncategorized"
                        )}
                    </td>


                    <td>
                        <strong>
                            ${formatCurrency(
                                product.price
                            )}
                        </strong>
                    </td>


                    <td>
                        <strong>
                            ${product.quantity}
                        </strong>
                    </td>


                    <td>
                        ${escapeHTML(
                            supplier?.name ||
                            "—"
                        )}
                    </td>


                    <td>

                        <span
                            class="stock-badge ${stockClass}"
                        >
                            ${product.quantity}
                            ·
                            ${stockText}
                        </span>

                    </td>


                    <td>

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="action-btn edit"
                                data-action="edit-product"
                                data-id="${product.product_id}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="action-btn delete"
                                data-action="delete-product"
                                data-id="${product.product_id}"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        }).join("");


    renderPagination(data);
}


// ============================================================
// PRODUCT PAGINATION
// ============================================================

function renderPagination(data) {

    const container =
        document.getElementById(
            "products-pagination"
        );


    const pages =
        Number(data.pages || 1);

    const current =
        Number(
            data.page ||
            currentProductPage
        );


    if (pages <= 1) {

        container.innerHTML = "";

        return;
    }


    let html = "";


    html += `

        <button
            type="button"
            class="secondary-btn"
            data-page="${current - 1}"
            ${current === 1 ? "disabled" : ""}
        >
            ‹
        </button>

    `;


    for (
        let i = 1;
        i <= pages;
        i++
    ) {

        html += `

            <button
                type="button"
                class="${
                    i === current
                        ? "primary-btn"
                        : "secondary-btn"
                }"
                data-page="${i}"
            >
                ${i}
            </button>

        `;

    }


    html += `

        <button
            type="button"
            class="secondary-btn"
            data-page="${current + 1}"
            ${current === pages ? "disabled" : ""}
        >
            ›
        </button>

    `;


    container.innerHTML = html;
}


document
    .getElementById(
        "products-pagination"
    )
    .addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button[data-page]"
                );

            if (
                !button ||
                button.disabled
            ) {
                return;
            }


            const page =
                Number(
                    button.dataset.page
                );


            loadProducts(
                page,
                document.getElementById(
                    "product-search"
                ).value.trim()
            );

        }
    );


// Product search
document
    .getElementById("search-btn")
    .addEventListener(
        "click",
        () => {

            const search =
                document.getElementById(
                    "product-search"
                ).value.trim();


            loadProducts(
                1,
                search
            );

        }
    );


document
    .getElementById("product-search")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                loadProducts(
                    1,
                    event.target.value.trim()
                );

            }

        }
    );


// ============================================================
// PRODUCT FORM
// ============================================================

document
    .getElementById("product-form")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                document.getElementById(
                    "product-id"
                ).value;


            const payload = {

                name:
                    document.getElementById(
                        "p-name"
                    ).value.trim(),

                category:
                    document.getElementById(
                        "p-category"
                    ).value.trim(),

                price:
                    parseFloat(
                        document.getElementById(
                            "p-price"
                        ).value
                    ),

                quantity:
                    parseInt(
                        document.getElementById(
                            "p-quantity"
                        ).value,
                        10
                    ),

                supplier_id:
                    document.getElementById(
                        "p-supplier"
                    ).value
                        ? parseInt(
                            document.getElementById(
                                "p-supplier"
                            ).value,
                            10
                        )
                        : null

            };


            if (
                !payload.name ||
                Number.isNaN(
                    payload.price
                ) ||
                Number.isNaN(
                    payload.quantity
                ) ||
                payload.price < 0 ||
                payload.quantity < 0
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

                    showToast(
                        "Product updated successfully."
                    );

                } else {

                    await apiRequest(
                        "/products",
                        "POST",
                        payload
                    );

                    showToast(
                        "Product added successfully."
                    );

                }


                resetProductForm();


                await Promise.all([

                    loadProducts(
                        currentProductPage,
                        currentProductSearch
                    ),

                    loadAllProductsForSaleDropdown(),

                    loadSummary()

                ]);

            } catch (error) {

                showToast(
                    getErrorMessage(error),
                    "error"
                );

            }

        }
    );


// Edit product
function editProduct(id) {

    const product =
        productsCache.find(
            p =>
                Number(
                    p.product_id
                ) === Number(id)
        );


    if (!product) return;


    document.getElementById(
        "product-id"
    ).value =
        product.product_id;


    document.getElementById(
        "p-name"
    ).value =
        product.name || "";


    document.getElementById(
        "p-category"
    ).value =
        product.category || "";


    document.getElementById(
        "p-price"
    ).value =
        product.price;


    document.getElementById(
        "p-quantity"
    ).value =
        product.quantity;


    document.getElementById(
        "p-supplier"
    ).value =
        product.supplier_id || "";


    document.getElementById(
        "product-form-title"
    ).textContent =
        "Edit Product";


    document.getElementById(
        "product-submit-text"
    ).textContent =
        "Update Product";


    document.getElementById(
        "product-submit-icon"
    ).textContent =
        "✓";


    document.getElementById(
        "product-cancel-btn"
    ).classList.remove(
        "hidden"
    );


    document
        .getElementById("p-name")
        .focus();

}


// Reset product form
function resetProductForm() {

    document
        .getElementById("product-form")
        .reset();


    document.getElementById(
        "product-id"
    ).value = "";


    document.getElementById(
        "product-form-title"
    ).textContent =
        "Add Product";


    document.getElementById(
        "product-submit-text"
    ).textContent =
        "Add Product";


    document.getElementById(
        "product-submit-icon"
    ).textContent =
        "＋";


    document.getElementById(
        "product-cancel-btn"
    ).classList.add(
        "hidden"
    );
}


document
    .getElementById(
        "product-cancel-btn"
    )
    .addEventListener(
        "click",
        resetProductForm
    );


// Delete product
async function deleteProduct(id) {

    if (
        !confirm(
            "Delete this product?"
        )
    ) {
        return;
    }


    try {

        await apiRequest(
            `/products/${id}`,
            "DELETE"
        );

        showToast(
            "Product deleted successfully."
        );


        await Promise.all([

            loadProducts(
                currentProductPage,
                currentProductSearch
            ),

            loadAllProductsForSaleDropdown(),

            loadSummary()

        ]);

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


// Product table events
document
    .querySelector(
        "#products-table tbody"
    )
    .addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) return;


            const id =
                Number(
                    button.dataset.id
                );

            const action =
                button.dataset.action;


            if (
                action ===
                "edit-product"
            ) {
                editProduct(id);
            }


            if (
                action ===
                "delete-product"
            ) {
                deleteProduct(id);
            }

        }
    );


// ============================================================
// SALE PRODUCT DROPDOWN
// ============================================================

function renderSaleProductOptions() {

    const select =
        document.getElementById(
            "sale-product"
        );


    const availableProducts =
        allProductsCache.filter(
            product =>
                Number(product.quantity) > 0
        );


    if (!availableProducts.length) {

        select.innerHTML = `

            <option value="">
                No products in stock
            </option>

        `;

        return;
    }


    select.innerHTML = `

        <option value="">
            Select a product
        </option>

        ${availableProducts
            .map(product => `

                <option
                    value="${product.product_id}"
                >
                    ${escapeHTML(
                        product.name
                    )}
                    — ${formatCurrency(
                        product.price
                    )}
                    · Stock ${product.quantity}
                </option>

            `)
            .join("")
        }

    `;
}


// ============================================================
// ADD SALE ITEM
// ============================================================

document
    .getElementById("add-item-btn")
    .addEventListener(
        "click",
        () => {

            const productId =
                parseInt(
                    document.getElementById(
                        "sale-product"
                    ).value,
                    10
                );


            const quantity =
                parseInt(
                    document.getElementById(
                        "sale-qty"
                    ).value,
                    10
                );


            const product =
                allProductsCache.find(
                    p =>
                        Number(
                            p.product_id
                        ) === productId
                );


            if (!product) {

                showToast(
                    "Please select a product.",
                    "error"
                );

                return;
            }


            if (
                !quantity ||
                quantity < 1
            ) {

                showToast(
                    "Quantity must be at least 1.",
                    "error"
                );

                return;
            }


            const existing =
                currentSaleItems.find(
                    item =>
                        item.product_id ===
                        productId
                );


            const totalQuantity =
                existing
                    ? existing.quantity +
                      quantity
                    : quantity;


            if (
                totalQuantity >
                Number(product.quantity)
            ) {

                showToast(
                    `Only ${product.quantity} units available.`,
                    "error"
                );

                return;
            }


            if (existing) {

                existing.quantity =
                    totalQuantity;

            } else {

                currentSaleItems.push({

                    product_id:
                        productId,

                    quantity:
                        quantity,

                    name:
                        product.name,

                    price:
                        Number(
                            product.price
                        )

                });

            }


            document.getElementById(
                "sale-qty"
            ).value = 1;


            renderSaleItems();


            showToast(
                "Item added to sale."
            );

        }
    );


// ============================================================
// RENDER SALE ITEMS
// ============================================================

function renderSaleItems() {

    const list =
        document.getElementById(
            "sale-items-list"
        );

    const count =
        document.getElementById(
            "sale-item-count"
        );

    const totalElement =
        document.getElementById(
            "sale-total"
        );


    count.textContent =
        `${currentSaleItems.length} item${
            currentSaleItems.length !== 1
                ? "s"
                : ""
        }`;


    if (
        currentSaleItems.length === 0
    ) {

        list.innerHTML = `

            <li
                style="
                    text-align:center;
                    color:var(--text-muted);
                    padding:22px;
                    font-size:10px;
                "
            >
                No items added yet
            </li>

        `;

        totalElement.textContent =
            "₹0.00";

        return;
    }


    list.innerHTML =
        currentSaleItems
            .map(
                (item, index) => {

                    const subtotal =
                        item.price *
                        item.quantity;


                    return `

                        <li class="sale-item">

                            <div class="sale-item-info">

                                <strong>
                                    ${escapeHTML(
                                        item.name
                                    )}
                                </strong>

                                <span>
                                    ${formatCurrency(
                                        item.price
                                    )}
                                    ×
                                    ${item.quantity}
                                </span>

                            </div>


                            <div class="sale-item-right">

                                <strong class="sale-item-price">
                                    ${formatCurrency(
                                        subtotal
                                    )}
                                </strong>

                                <button
                                    type="button"
                                    class="remove-item"
                                    onclick="removeSaleItem(${index})"
                                    title="Remove item"
                                >
                                    ×
                                </button>

                            </div>

                        </li>

                    `;

                }
            )
            .join("");


    const total =
        currentSaleItems.reduce(
            (sum, item) =>
                sum +
                item.price *
                item.quantity,
            0
        );


    totalElement.textContent =
        formatCurrency(total);
}


// Remove sale item
function removeSaleItem(index) {

    currentSaleItems.splice(
        index,
        1
    );

    renderSaleItems();
}


// ============================================================
// SUBMIT SALE
// ============================================================

document
    .getElementById(
        "submit-sale-btn"
    )
    .addEventListener(
        "click",
        async () => {

            if (
                currentSaleItems.length ===
                0
            ) {

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
                            currentSaleItems.map(
                                item => ({

                                    product_id:
                                        item.product_id,

                                    quantity:
                                        item.quantity

                                })
                            )
                    }
                );


                currentSaleItems = [];

                renderSaleItems();


                showToast(
                    "Sale completed successfully."
                );


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

        }
    );


// ============================================================
// SALES HISTORY
// ============================================================

async function loadSales() {

    try {

        salesCache =
            await apiRequest(
                "/sales"
            );

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
        document.querySelector(
            "#sales-table tbody"
        );

    const emptyState =
        document.getElementById(
            "sales-empty"
        );


    const search =
        currentSalesSearch
            .toLowerCase()
            .trim();


    const filtered =
        salesCache.filter(
            sale => {

                const saleId =
                    String(
                        sale.sale_id
                    );


                const date =
                    new Date(
                        sale.date
                    )
                    .toLocaleString()
                    .toLowerCase();


                return (
                    saleId.includes(search) ||
                    date.includes(search)
                );

            }
        );


    if (!filtered.length) {

        tbody.innerHTML = "";

        emptyState.classList.remove(
            "hidden"
        );

        return;
    }


    emptyState.classList.add(
        "hidden"
    );


    tbody.innerHTML =
        filtered.map(sale => `

            <tr>

                <td>
                    <strong>
                        #${sale.sale_id}
                    </strong>
                </td>


                <td>
                    ${new Date(
                        sale.date
                    ).toLocaleString()}
                </td>


                <td>
                    <strong>
                        ${formatCurrency(
                            sale.total_amount
                        )}
                    </strong>
                </td>


                <td>

                    <div
                        style="
                            display:flex;
                            flex-wrap:wrap;
                            gap:5px;
                        "
                    >

                        ${(
                            sale.items || []
                        )
                        .map(item => `

                            <span
                                style="
                                    display:inline-flex;
                                    align-items:center;
                                    background:var(--surface-soft);
                                    border:1px solid var(--border);
                                    border-radius:20px;
                                    padding:5px 8px;
                                    font-size:9px;
                                    color:var(--text-soft);
                                "
                            >
                                #${item.product_id}
                                ×
                                ${item.quantity}
                            </span>

                        `)
                        .join("")}

                    </div>

                </td>

            </tr>

        `).join("");
}


// Sales search
document
    .getElementById(
        "sales-search-btn"
    )
    .addEventListener(
        "click",
        () => {

            currentSalesSearch =
                document.getElementById(
                    "sales-search"
                ).value;

            renderSales();

        }
    );


document
    .getElementById(
        "sales-search"
    )
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                currentSalesSearch =
                    event.target.value;

                renderSales();

            }

        }
    );


// ============================================================
// CSV EXPORT
// ============================================================

async function downloadCSV(
    path,
    filename
) {

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

            const errorData =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );

            throw new Error(
                errorData.error ||
                "Export failed."
            );
        }


        const blob =
            await response.blob();


        const url =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            url
        );


        showToast(
            `${filename} exported successfully.`
        );

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

    }
}


document
    .getElementById(
        "export-products-btn"
    )
    .addEventListener(
        "click",
        () => {

            downloadCSV(
                "/dashboard/export/products",
                "products_report.csv"
            );

        }
    );


document
    .getElementById(
        "export-sales-btn"
    )
    .addEventListener(
        "click",
        () => {

            downloadCSV(
                "/dashboard/export/sales",
                "sales_report.csv"
            );

        }
    );


// ============================================================
// INITIAL LOAD
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

        console.error(
            "Dashboard initialization error:",
            error
        );

        showToast(
            getErrorMessage(error),
            "error"
        );

    }

})();

