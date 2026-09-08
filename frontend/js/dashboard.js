// =========================================================
// AUTH CHECK
// =========================================================

if (!getToken()) {

    window.location.href =
        "index.html";
}


// =========================================================
// USER
// =========================================================

const user =
    JSON.parse(
        localStorage.getItem("user") || "{}"
    );


const userName =
    user.name || "Admin";


const userRole =
    user.role || "Administrator";


document.getElementById(
    "welcome-name"
).textContent = userName;


document.getElementById(
    "sidebar-user-name"
).textContent = userName;


document.getElementById(
    "sidebar-user-role"
).textContent = userRole;


const initial =
    userName
        .charAt(0)
        .toUpperCase();


document.getElementById(
    "user-avatar"
).textContent = initial;


document.getElementById(
    "top-avatar"
).textContent = initial;


// =========================================================
// LOGOUT
// =========================================================

document
    .getElementById("logout-btn")
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );

            window.location.href =
                "index.html";

        }
    );


// =========================================================
// DATA
// =========================================================

let suppliersCache = [];

let productsCache = [];

let salesCache = [];

let currentSaleItems = [];


// =========================================================
// TOAST
// =========================================================

function showToast(
    message,
    type = "success"
) {

    const container =
        document.getElementById(
            "toast-container"
        );


    const toast =
        document.createElement("div");


    toast.className =
        `toast ${type}`;


    toast.innerHTML = `
        <span>
            ${type === "success" ? "✓" : "!"}
        </span>

        <span>
            ${escapeHTML(message)}
        </span>
    `;


    container.appendChild(toast);


    setTimeout(
        () => {
            toast.remove();
        },
        3000
    );

}


// =========================================================
// TABS
// =========================================================

document
    .querySelectorAll(".sidebar-link")
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const tab =
                        button.dataset.tab;


                    document
                        .querySelectorAll(
                            ".sidebar-link"
                        )
                        .forEach(
                            (btn) => {
                                btn.classList.remove(
                                    "active"
                                );
                            }
                        );


                    document
                        .querySelectorAll(
                            ".tab-content"
                        )
                        .forEach(
                            (section) => {
                                section.classList.add(
                                    "hidden"
                                );
                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    document
                        .getElementById(
                            `tab-${tab}`
                        )
                        .classList.remove(
                            "hidden"
                        );


                    const titles = {

                        products:
                            "Inventory Overview",

                        suppliers:
                            "Supplier Management",

                        sales:
                            "Sales Management"

                    };


                    const sectionNames = {

                        products:
                            "Products",

                        suppliers:
                            "Suppliers",

                        sales:
                            "Sales"

                    };


                    document.getElementById(
                        "page-title"
                    ).textContent =
                        titles[tab];


                    document.getElementById(
                        "current-section"
                    ).textContent =
                        sectionNames[tab];

                }
            );

        }
    );


// =========================================================
// SUMMARY
// =========================================================

async function loadSummary() {

    const data =
        await apiRequest(
            "/dashboard/summary"
        );


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
                ${Number(data.total_products || 0)}
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
                ${Number(data.total_sales || 0)}
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
                ₹${Number(
                    data.total_revenue || 0
                ).toFixed(2)}
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
                ${
                    Array.isArray(
                        data.low_stock_products
                    )
                        ? data.low_stock_products.length
                        : 0
                }
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


    const lowStock =
        Array.isArray(
            data.low_stock_products
        )
            ? data.low_stock_products
            : [];


    if (lowStock.length > 0) {

        alertBox.classList.remove(
            "hidden"
        );


        alertBox.innerHTML = `

            <div class="alert-icon">
                !
            </div>

            <div>

                <strong>
                    Low stock alert:
                </strong>

                ${lowStock
                    .map(
                        (p) =>
                            `${escapeHTML(
                                p.name
                            )} (${p.quantity})`
                    )
                    .join(", ")}

            </div>

        `;

    } else {

        alertBox.classList.add(
            "hidden"
        );

    }

}


// =========================================================
// SUPPLIERS
// =========================================================

async function loadSuppliers() {

    suppliersCache =
        await apiRequest(
            "/suppliers"
        );


    renderSuppliers();


    const supplierSelect =
        document.getElementById(
            "p-supplier"
        );


    supplierSelect.innerHTML =
        `<option value="">
            No supplier
        </option>` +
        suppliersCache
            .map(
                (supplier) => `
                    <option
                        value="${supplier.supplier_id}"
                    >
                        ${escapeHTML(
                            supplier.name
                        )}
                    </option>
                `
            )
            .join("");

}


// ---------------------------------------------------------
// RENDER SUPPLIERS
// ---------------------------------------------------------

function renderSuppliers() {

    const search =
        document
            .getElementById(
                "supplier-search"
            )
            .value
            .toLowerCase()
            .trim();


    const filtered =
        suppliersCache.filter(
            (supplier) => {

                return (

                    String(
                        supplier.supplier_id
                    ).includes(search)

                    ||

                    (supplier.name || "")
                        .toLowerCase()
                        .includes(search)

                    ||

                    (supplier.phone || "")
                        .toLowerCase()
                        .includes(search)

                    ||

                    (supplier.email || "")
                        .toLowerCase()
                        .includes(search)

                );

            }
        );


    document.getElementById(
        "supplier-count"
    ).textContent =
        `${suppliersCache.length} supplier${
            suppliersCache.length !== 1
                ? "s"
                : ""
        }`;


    const tbody =
        document.querySelector(
            "#suppliers-table tbody"
        );


    const empty =
        document.getElementById(
            "suppliers-empty"
        );


    if (filtered.length === 0) {

        tbody.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    tbody.innerHTML =
        filtered
            .map(
                (supplier) => `

                    <tr>

                        <td>
                            #${supplier.supplier_id}
                        </td>


                        <td>

                            <div class="product-name-cell">

                                <div class="product-mini-icon">
                                    ${escapeHTML(
                                        (
                                            supplier.name ||
                                            "S"
                                        )
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
                                supplier.phone ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                supplier.email ||
                                "—"
                            )}
                        </td>


                        <td>

                            <div class="action-buttons">

                                <button
                                    class="action-btn edit"
                                    onclick="editSupplier(
                                        ${supplier.supplier_id}
                                    )"
                                >
                                    Edit
                                </button>


                                <button
                                    class="action-btn delete"
                                    onclick="deleteSupplier(
                                        ${supplier.supplier_id}
                                    )"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>

                `
            )
            .join("");

}


// Supplier search

document
    .getElementById(
        "supplier-search"
    )
    .addEventListener(
        "input",
        renderSuppliers
    );


// ---------------------------------------------------------
// SUPPLIER FORM
// ---------------------------------------------------------

document
    .getElementById(
        "supplier-form"
    )
    .addEventListener(
        "submit",
        async (event) => {

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


            try {

                if (id) {

                    await apiRequest(
                        `/suppliers/${id}`,
                        "PUT",
                        payload
                    );


                    showToast(
                        "Supplier updated successfully"
                    );

                } else {

                    await apiRequest(
                        "/suppliers",
                        "POST",
                        payload
                    );


                    showToast(
                        "Supplier added successfully"
                    );

                }


                cancelSupplierEdit();


                await loadSuppliers();

                await loadProducts();


            } catch (error) {

                showToast(
                    error.message,
                    "error"
                );

            }

        }
    );


// ---------------------------------------------------------
// EDIT SUPPLIER
// ---------------------------------------------------------

window.editSupplier =
    function (id) {

        const supplier =
            suppliersCache.find(
                (s) =>
                    s.supplier_id === id
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

    };


// ---------------------------------------------------------
// CANCEL SUPPLIER
// ---------------------------------------------------------

window.cancelSupplierEdit =
    function () {

        document
            .getElementById(
                "supplier-form"
            )
            .reset();


        document.getElementById(
            "supplier-id"
        ).value = "";


        document.getElementById(
            "supplier-submit-text"
        ).textContent =
            "Save Supplier";


        document.getElementById(
            "supplier-submit-icon"
        ).textContent =
            "+";


        document.getElementById(
            "supplier-cancel-btn"
        ).classList.add(
            "hidden"
        );

    };


// ---------------------------------------------------------
// FOCUS SUPPLIER FORM
// ---------------------------------------------------------

window.focusSupplierForm =
    function () {

        document
            .getElementById(
                "s-name"
            )
            .focus();

    };


// ---------------------------------------------------------
// DELETE SUPPLIER
// ---------------------------------------------------------

window.deleteSupplier =
    async function (id) {

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
                "Supplier deleted successfully"
            );


            await loadSuppliers();

            await loadProducts();


        } catch (error) {

            showToast(
                error.message,
                "error"
            );

        }

    };


// =========================================================
// PRODUCTS
// =========================================================

async function loadProducts() {

    productsCache =
        await apiRequest(
            "/products"
        );


    renderProducts();

    renderSaleProductOptions();

}


// ---------------------------------------------------------
// RENDER PRODUCTS
// ---------------------------------------------------------

function renderProducts() {

    const search =
        document
            .getElementById(
                "product-search"
            )
            .value
            .toLowerCase()
            .trim();


    const filtered =
        productsCache.filter(
            (product) => {

                const supplier =
                    suppliersCache.find(
                        (s) =>
                            s.supplier_id ===
                            product.supplier_id
                    );


                return (

                    String(
                        product.product_id
                    ).includes(search)

                    ||

                    (product.name || "")
                        .toLowerCase()
                        .includes(search)

                    ||

                    (product.category || "")
                        .toLowerCase()
                        .includes(search)

                    ||

                    (supplier?.name || "")
                        .toLowerCase()
                        .includes(search)

                );

            }
        );


    document.getElementById(
        "product-count"
    ).textContent =
        `${productsCache.length} product${
            productsCache.length !== 1
                ? "s"
                : ""
        }`;


    const tbody =
        document.querySelector(
            "#products-table tbody"
        );


    const empty =
        document.getElementById(
            "products-empty"
        );


    if (filtered.length === 0) {

        tbody.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    tbody.innerHTML =
        filtered
            .map(
                (product) => {

                    const supplier =
                        suppliersCache.find(
                            (s) =>
                                s.supplier_id ===
                                product.supplier_id
                        );


                    let stockClass =
                        "stock-good";


                    let stockText =
                        "In stock";


                    if (
                        product.quantity <= 0
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
                                            Product ID
                                            #${product.product_id}
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
                                    ₹${Number(
                                        product.price ||
                                        0
                                    ).toFixed(2)}
                                </strong>
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
                                ${escapeHTML(
                                    supplier?.name ||
                                    "—"
                                )}
                            </td>


                            <td>

                                <div class="action-buttons">

                                    <button
                                        class="action-btn edit"
                                        onclick="editProduct(
                                            ${product.product_id}
                                        )"
                                    >
                                        Edit
                                    </button>


                                    <button
                                        class="action-btn delete"
                                        onclick="deleteProduct(
                                            ${product.product_id}
                                        )"
                                    >
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


// Product search

document
    .getElementById(
        "product-search"
    )
    .addEventListener(
        "input",
        renderProducts
    );


// ---------------------------------------------------------
// PRODUCT FORM
// ---------------------------------------------------------

document
    .getElementById(
        "product-form"
    )
    .addEventListener(
        "submit",
        async (event) => {

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
                    ).value || null

            };


            try {

                if (id) {

                    await apiRequest(
                        `/products/${id}`,
                        "PUT",
                        payload
                    );


                    showToast(
                        "Product updated successfully"
                    );

                } else {

                    await apiRequest(
                        "/products",
                        "POST",
                        payload
                    );


                    showToast(
                        "Product added successfully"
                    );

                }


                cancelProductEdit();


                await loadProducts();

                await loadSummary();


            } catch (error) {

                showToast(
                    error.message,
                    "error"
                );

            }

        }
    );


// ---------------------------------------------------------
// EDIT PRODUCT
// ---------------------------------------------------------

window.editProduct =
    function (id) {

        const product =
            productsCache.find(
                (p) =>
                    p.product_id === id
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

    };


// ---------------------------------------------------------
// CANCEL PRODUCT
// ---------------------------------------------------------

window.cancelProductEdit =
    function () {

        document
            .getElementById(
                "product-form"
            )
            .reset();


        document.getElementById(
            "product-id"
        ).value = "";


        document.getElementById(
            "product-submit-text"
        ).textContent =
            "Save Product";


        document.getElementById(
            "product-submit-icon"
        ).textContent =
            "+";


        document.getElementById(
            "product-cancel-btn"
        ).classList.add(
            "hidden"
        );

    };


// ---------------------------------------------------------
// FOCUS PRODUCT FORM
// ---------------------------------------------------------

window.focusProductForm =
    function () {

        document
            .getElementById(
                "p-name"
            )
            .focus();

    };


// ---------------------------------------------------------
// DELETE PRODUCT
// ---------------------------------------------------------

window.deleteProduct =
    async function (id) {

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
                "Product deleted successfully"
            );


            await loadProducts();

            await loadSummary();


        } catch (error) {

            showToast(
                error.message,
                "error"
            );

        }

    };


// =========================================================
// SALE PRODUCT SELECT
// =========================================================

function renderSaleProductOptions() {

    const select =
        document.getElementById(
            "sale-product"
        );


    const availableProducts =
        productsCache.filter(
            (product) =>
                product.quantity > 0
        );


    if (
        availableProducts.length === 0
    ) {

        select.innerHTML =
            `<option value="">
                No products in stock
            </option>`;

        return;

    }


    select.innerHTML =
        `<option value="">
            Select a product
        </option>` +
        availableProducts
            .map(
                (product) => `

                    <option
                        value="${product.product_id}"
                    >
                        ${escapeHTML(
                            product.name
                        )}
                        —
                        ₹${Number(
                            product.price || 0
                        ).toFixed(2)}
                        · Stock
                        ${product.quantity}
                    </option>

                `
            )
            .join("");

}


// =========================================================
// ADD SALE ITEM
// =========================================================

document
    .getElementById(
        "add-item-btn"
    )
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
                productsCache.find(
                    (p) =>
                        p.product_id ===
                        productId
                );


            if (!product) {

                showToast(
                    "Please select a product",
                    "error"
                );

                return;

            }


            if (
                !quantity ||
                quantity < 1
            ) {

                showToast(
                    "Quantity must be at least 1",
                    "error"
                );

                return;

            }


            const existing =
                currentSaleItems.find(
                    (item) =>
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
                product.quantity
            ) {

                showToast(
                    `Only ${product.quantity} units available`,
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
                "Item added to sale"
            );

        }
    );


// =========================================================
// RENDER SALE ITEMS
// =========================================================

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

            <li class="sale-item">

                <div class="sale-item-info">

                    <strong>
                        No items added yet
                    </strong>

                    <span>
                        Select a product above
                        to add it to this sale.
                    </span>

                </div>

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
                                    ₹${item.price.toFixed(2)}
                                    ×
                                    ${item.quantity}
                                </span>

                            </div>


                            <div class="sale-item-right">

                                <strong class="sale-item-price">
                                    ₹${subtotal.toFixed(2)}
                                </strong>


                                <button
                                    class="remove-item"
                                    onclick="removeSaleItem(
                                        ${index}
                                    )"
                                    title="Remove"
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
        `₹${total.toFixed(2)}`;

}


// ---------------------------------------------------------
// REMOVE SALE ITEM
// ---------------------------------------------------------

window.removeSaleItem =
    function (index) {

        currentSaleItems.splice(
            index,
            1
        );


        renderSaleItems();

    };


// =========================================================
// SUBMIT SALE
// =========================================================

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
                    "Add at least one item before completing the sale",
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
                                (item) => ({
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
                    "Sale completed successfully"
                );


                await loadProducts();

                await loadSales();

                await loadSummary();


            } catch (error) {

                showToast(
                    error.message,
                    "error"
                );

            }

        }
    );


// =========================================================
// SALES HISTORY
// =========================================================

async function loadSales() {

    salesCache =
        await apiRequest(
            "/sales"
        );


    renderSales();

}


// ---------------------------------------------------------
// RENDER SALES
// ---------------------------------------------------------

function renderSales() {

    const search =
        document
            .getElementById(
                "sales-search"
            )
            .value
            .toLowerCase()
            .trim();


    const filtered =
        salesCache.filter(
            (sale) => {

                const date =
                    new Date(
                        sale.date
                    )
                        .toLocaleString()
                        .toLowerCase();


                return (

                    String(
                        sale.sale_id
                    ).includes(search)

                    ||

                    date.includes(search)

                );

            }
        );


    const tbody =
        document.querySelector(
            "#sales-table tbody"
        );


    const empty =
        document.getElementById(
            "sales-empty"
        );


    if (
        filtered.length === 0
    ) {

        tbody.innerHTML = "";

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    tbody.innerHTML =
        filtered
            .map(
                (sale) => `

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
                                ₹${Number(
                                    sale.total_amount ||
                                    0
                                ).toFixed(2)}
                            </strong>
                        </td>


                        <td>

                            ${
                                Array.isArray(
                                    sale.items
                                )
                                    ? sale.items
                                        .map(
                                            (item) => `
                                                <span
                                                    style="
                                                        display:inline-block;
                                                        background:#f1f5f9;
                                                        border-radius:5px;
                                                        padding:4px 7px;
                                                        margin:2px;
                                                        font-size:9px;
                                                    "
                                                >
                                                    #${item.product_id}
                                                    ×
                                                    ${item.quantity}
                                                </span>
                                            `
                                        )
                                        .join("")
                                    : "—"
                            }

                        </td>

                    </tr>

                `
            )
            .join("");

}


// Sales search

document
    .getElementById(
        "sales-search"
    )
    .addEventListener(
        "input",
        renderSales
    );


// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================================
// INITIAL LOAD
// =========================================================

(async function init() {

    try {

        await loadSuppliers();

        await loadProducts();

        await loadSales();

        await loadSummary();

        renderSaleItems();


    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load dashboard",
            "error"
        );

    }

})();