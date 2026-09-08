# Cloud-Based Small Business Inventory & Sales Management System

A full-stack app: **HTML/CSS/JS frontend → Flask REST API backend → MySQL cloud database**,
with JWT authentication, role-based users (admin/staff), full CRUD, sales transactions that
auto-deduct stock, and a low-stock alert dashboard.

Tested end-to-end locally before you got this: login, supplier CRUD, product CRUD, sale
creation with stock deduction, and dashboard summary all work.

Link https://inventorymgtsys.netlify.app/
---

## 1. Project structure

```
inventory-management-system/
├── backend/
│   ├── app.py              # Flask app factory, registers all routes
│   ├── config.py           # reads DATABASE_URL / JWT secret from env
│   ├── models.py           # SQLAlchemy models (users, products, suppliers, sales, sale_items)
│   ├── init_db.py          # creates tables + seeds an admin user
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py         # /api/auth/register, /api/auth/login
│       ├── products.py     # /api/products (full CRUD)
│       ├── suppliers.py    # /api/suppliers (full CRUD)
│       ├── sales.py        # /api/sales (create + list, deducts stock)
│       └── dashboard.py    # /api/dashboard/summary, /top-products
├── frontend/
│   ├── index.html          # login page
│   ├── dashboard.html      # products / suppliers / sales UI
│   ├── css/style.css
│   └── js/{api.js, login.js, dashboard.js}
├── database/
│   └── schema.sql          # documented schema for your submission
└── README.md
```

---

## 2. Run it locally (do this first)

### Backend

```bash
cd inventory-management-system/backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# uses local SQLite by default — no setup needed to just try it
python init_db.py               # creates tables + admin user
python app.py                   # runs on http://localhost:8080
```

Default login seeded by `init_db.py`:
```
email: admin@shop.com
password: Admin@123
```

### Frontend

In a new terminal (no build step needed, it's plain HTML/JS):

```bash
cd inventory-management-system/frontend
python3 -m http.server 3000
```

Open **http://localhost:3000** in your browser and log in.

> `frontend/js/api.js` has `API_BASE = "http://localhost:8080/api"` — change this
> to your deployed backend URL later.

### Quick API test with curl (optional, confirms backend works standalone)

```bash
# Login and grab a token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shop.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Create a supplier
curl -X POST http://localhost:8080/api/suppliers \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Acme Supplies","phone":"9999999999","email":"acme@example.com"}'

# Create a product
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Wireless Mouse","category":"Electronics","price":599,"quantity":20,"supplier_id":1}'

# List products
curl http://localhost:8080/api/products -H "Authorization: Bearer $TOKEN"

# Record a sale (auto-deducts stock)
curl -X POST http://localhost:8080/api/sales \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"items":[{"product_id":1,"quantity":3}]}'

# Dashboard summary + low-stock alerts
curl http://localhost:8080/api/dashboard/summary -H "Authorization: Bearer $TOKEN"
```

You can also import these into **Postman**: create a collection, add a "Bearer Token" auth
header at the collection level, and hit each endpoint below.

---

## 3. REST API reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | no | create a user |
| POST | `/api/auth/login` | no | get JWT token |
| GET/POST | `/api/products` | yes | list / create products |
| GET/PUT/DELETE | `/api/products/:id` | yes | read / update / delete a product |
| GET/POST | `/api/suppliers` | yes | list / create suppliers |
| GET/PUT/DELETE | `/api/suppliers/:id` | yes | read / update / delete a supplier |
| GET/POST | `/api/sales` | yes | list sales / record a new sale |
| GET/DELETE | `/api/sales/:id` | yes | read / delete a sale |
| GET | `/api/dashboard/summary` | yes | totals + low-stock list |
| GET | `/api/dashboard/top-products` | yes | best sellers |

All authenticated routes require header: `Authorization: Bearer <token>`.

---

## 4. Put the database on the cloud (do this before deploying the backend)

This app uses **MySQL** via PyMySQL. Pick one of these — both give you a ready-made
connection string, so you never hand-type host/port/credentials:

**Option A — Railway (MySQL, easiest, free trial credit)**
1. Go to https://railway.app → New Project → **Provision MySQL**.
2. Click the MySQL service → **Connect** tab → copy the **"MySQL Connection URL"**
   shown there (it already starts with `mysql://...`).
3. Paste it as-is into `DATABASE_URL`, just change `mysql://` to `mysql+pymysql://`
   at the front. Everything else (host, port, password) stays exactly as copied —
   don't retype any of it by hand, that's the #1 source of connection failures.
   
mysql+pymysql://user:password@host:port/dbname
```

**Test the connection string before doing anything else:**
```bash
cd backend
python3 -c "
import pymysql
url = 'PASTE_YOUR_HOST_HERE'   # just the host part, e.g. containers-us-west-1.railway.app
pymysql.connect(host=url, user='USER', password='PASSWORD', database='DBNAME', port=PORT)
print('Connected successfully')
"
```
If that prints "Connected successfully," your `DATABASE_URL` is good and
`python init_db.py` (below) will work.

---

## 5. Push to GitHub

```bash
cd inventory-management-system
git init
git add .
git commit -m "Initial commit: full-stack inventory & sales management system"
git branch -M main
git remote add origin https://github.com/<your-username>/inventory-management-system.git
git push -u origin main
```

(`.gitignore` already excludes `venv/`, `.env`, and the local SQLite file.)

---

## 6. Deploy the backend (Render, free tier)

1. render.com → New → Web Service → connect your GitHub repo.
2. Settings:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `gunicorn app:app`
3. Environment variables (Render dashboard → Environment):
   ```
   DATABASE_URL = <your MySQL URL from step 4>
   JWT_SECRET_KEY = <any long random string>
   ```
4. Deploy. You'll get a URL like `https://inventory-backend.onrender.com`.
5. Run the DB init once, from your local machine, pointed at the cloud DB:
   ```bash
   cd backend
   export DATABASE_URL="mysql+pymysql://user:password@host:port/dbname"   # Windows: set DATABASE_URL=...
   python init_db.py
   ```

---

## 7. Deploy the frontend (Netlify, free tier)

1. Edit `frontend/js/api.js`:
   ```js
   const API_BASE = "https://inventory-backend.onrender.com/api";
   ```
2. Commit and push that change.
3. netlify.com → Add new site → Import from GitHub → pick this repo.
   - **Base directory:** `frontend`
   - **Publish directory:** `frontend`
4. Deploy. You'll get a URL like `https://your-app.netlify.app`.

---

## 8. Notes on the "cloud computing concepts" this demonstrates

- **Cloud hosting** — frontend on Netlify, backend on Render, both reachable over the internet.
- **Cloud database** — MySQL hosted on Railway/Aiven, not on your laptop.
- **Client-server architecture** — browser → REST API → database, cleanly separated.
- **REST API** — every action is an HTTP verb + JSON, documented above.
- **Security** — password hashing (werkzeug), JWT-based auth, environment variables for
  secrets (never hardcoded), CORS configured explicitly.
- **Separation of concerns** — frontend, backend, and database are three independently
  deployable components.
