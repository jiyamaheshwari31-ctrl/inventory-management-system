import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_products_require_auth(client):
    res = client.get("/api/products")
    assert res.status_code == 401


def _register_and_login(client, email="test@example.com", role="staff"):
    if role == "admin":
        # Public /register can never create admins, so seed one straight in the DB.
        from models import db, User
        with client.application.app_context():
            u = User(name="Admin", email=email, role="admin")
            u.set_password("pass123")
            db.session.add(u)
            db.session.commit()
    else:
        client.post("/api/auth/register", json={"name": "Test User", "email": email, "password": "pass123"})
    res = client.post("/api/auth/login", json={"email": email, "password": "pass123"})
    return res.get_json()["access_token"]


def test_register_and_login_with_bcrypt(client):
    token = _register_and_login(client, "bcrypt@example.com")
    assert token


def test_rbac_staff_cannot_create_product(client):
    token = _register_and_login(client, "staffrbac@example.com", role="staff")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/products", json={"name": "Mouse", "price": 599, "quantity": 10}, headers=headers)
    assert res.status_code == 403


def test_rbac_admin_can_create_product(client):
    token = _register_and_login(client, "adminrbac@example.com", role="admin")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/products", json={"name": "Mouse", "price": 599, "quantity": 10}, headers=headers)
    assert res.status_code == 201


def test_product_pagination_and_search(client):
    token = _register_and_login(client, "search@example.com", role="admin")
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/api/products", json={"name": "Keyboard", "price": 1200, "quantity": 5}, headers=headers)

    res = client.get("/api/products?search=keyboard", headers=headers)
    assert res.get_json()["total"] == 1


def test_sale_deducts_stock(client):
    token = _register_and_login(client, "sale@example.com", role="admin")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/products", json={"name": "Monitor", "price": 8000, "quantity": 5}, headers=headers)
    product_id = res.get_json()["product_id"]

    res = client.post("/api/sales", json={"items": [{"product_id": product_id, "quantity": 2}]}, headers=headers)
    assert res.status_code == 201

    res = client.get(f"/api/products/{product_id}", headers=headers)
    assert res.get_json()["quantity"] == 3


def test_mfa_setup_and_verify(client):
    token = _register_and_login(client, "mfa@example.com", role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/auth/mfa/setup", headers=headers)
    assert res.status_code == 200
    secret = res.get_json()["secret"]

    import pyotp
    code = pyotp.TOTP(secret).now()
    res = client.post("/api/auth/mfa/verify", json={"totp_code": code}, headers=headers)
    assert res.status_code == 200

    # Logging in again should now require a TOTP code
    res = client.post("/api/auth/login", json={"email": "mfa@example.com", "password": "pass123"})
    assert res.get_json().get("mfa_required") is True


def test_cannot_self_register_as_admin(client):
    res = client.post("/api/auth/register", json={
        "name": "Evil", "email": "evil@example.com", "password": "pass123", "role": "admin"})
    assert res.status_code == 403


def test_password_stored_as_bcrypt(client):
    from models import User
    client.post("/api/auth/register", json={"name": "B", "email": "b@example.com", "password": "pass123"})
    with client.application.app_context():
        stored = User.query.filter_by(email="b@example.com").first().password_hash
    assert stored.startswith("$2") and "pass123" not in stored


def test_legacy_werkzeug_hash_upgraded_to_bcrypt_on_login(client):
    from werkzeug.security import generate_password_hash
    from models import db, User
    with client.application.app_context():
        u = User(name="Old", email="old@example.com", role="staff",
                 password_hash=generate_password_hash("pass123"))
        db.session.add(u)
        db.session.commit()
        assert not u.password_hash.startswith("$2")
    res = client.post("/api/auth/login", json={"email": "old@example.com", "password": "pass123"})
    assert res.status_code == 200
    with client.application.app_context():
        assert User.query.filter_by(email="old@example.com").first().password_hash.startswith("$2")


def test_update_and_delete_rejected_without_token(client):
    assert client.put("/api/products/1", json={"price": 1}).status_code == 401
    assert client.delete("/api/products/1").status_code == 401
    assert client.delete("/api/sales/1").status_code == 401


def test_staff_cannot_update_or_delete(client):
    admin = {"Authorization": "Bearer " + _register_and_login(client, "a1@example.com", "admin")}
    staff = {"Authorization": "Bearer " + _register_and_login(client, "s1@example.com")}
    pid = client.post("/api/products", json={"name": "Pen", "price": 10, "quantity": 5}, headers=admin).get_json()["product_id"]
    assert client.put(f"/api/products/{pid}", json={"price": 1}, headers=staff).status_code == 403
    assert client.delete(f"/api/products/{pid}", headers=staff).status_code == 403
    assert client.delete(f"/api/products/{pid}", headers=admin).status_code == 200


def test_login_with_mfa_requires_valid_code(client):
    import pyotp
    token = _register_and_login(client, "m2@example.com", "admin")
    h = {"Authorization": f"Bearer {token}"}
    secret = client.post("/api/auth/mfa/setup", headers=h).get_json()["secret"]
    client.post("/api/auth/mfa/verify", json={"totp_code": pyotp.TOTP(secret).now()}, headers=h)
    creds = {"email": "m2@example.com", "password": "pass123"}
    assert client.post("/api/auth/login", json={**creds, "totp_code": "000000"}).status_code == 401
    ok = client.post("/api/auth/login", json={**creds, "totp_code": pyotp.TOTP(secret).now()})
    assert ok.status_code == 200 and "access_token" in ok.get_json()


def test_login_rate_limited(client):
    codes = [client.post("/api/auth/login", json={"email": "x@example.com", "password": "bad"}).status_code
             for _ in range(7)]
    assert 429 in codes
