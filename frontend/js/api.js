// =========================================================
// API CONFIGURATION
// =========================================================

// Your backend already contains /api in its base path.
const API_BASE = "https://inventory-management-system-c5tr.onrender.com/api";


function getToken() {
    return localStorage.getItem("token");
}


async function apiRequest(
    path,
    method = "GET",
    body = null,
    auth = true
) {

    const headers = {
        "Content-Type": "application/json"
    };

    const token = getToken();

    if (auth && token) {
        headers["Authorization"] = `Bearer ${token}`;
    }


    const response = await fetch(
        `${API_BASE}${path}`,
        {
            method,
            headers,
            body: body
                ? JSON.stringify(body)
                : null
        }
    );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            "Request failed"
        );

    }


    return data;
}