// Change this to your deployed backend URL once deployed, e.g.
// const API_BASE = "https://your-backend.onrender.com/api";
const API_BASE = "http://localhost:8080/api";

function getToken() {
  return localStorage.getItem("token");
}

async function apiRequest(path, method = "GET", body = null, auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers["Authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
