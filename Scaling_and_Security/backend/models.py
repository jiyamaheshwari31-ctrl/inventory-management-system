from flask_sqlalchemy import SQLAlchemy
import bcrypt
from werkzeug.security import check_password_hash
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)  # bcrypt hash (includes salt)
    role = db.Column(db.String(20), nullable=False, default="staff")  # admin | staff

    # --- MFA (TOTP) ---
    totp_secret = db.Column(db.String(32))          # base32 secret, set when MFA is enabled
    mfa_enabled = db.Column(db.Boolean, default=False, nullable=False)

    def set_password(self, password: str):
        # bcrypt generates a random salt per call and embeds it in the hash itself —
        # this satisfies "salted hash (bcrypt or Argon2)" explicitly.
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, password: str) -> bool:
        stored = self.password_hash or ""
        if stored.startswith("$2"):
            return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
        # Legacy hash from Assignment 1 (werkzeug scrypt/pbkdf2). If it matches,
        # silently upgrade the stored value to bcrypt so old users migrate on login.
        if check_password_hash(stored, password):
            self.set_password(password)
            return True
        return False

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "mfa_enabled": self.mfa_enabled,
        }


class Supplier(db.Model):
    __tablename__ = "suppliers"
    supplier_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    products = db.relationship("Product", backref="supplier", lazy=True)

    def to_dict(self):
        return {"supplier_id": self.supplier_id, "name": self.name, "phone": self.phone, "email": self.email}


class Product(db.Model):
    __tablename__ = "products"
    product_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80))
    price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    low_stock_threshold = db.Column(db.Integer, nullable=False, default=5)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.supplier_id"))

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "name": self.name,
            "category": self.category,
            "price": float(self.price),
            "quantity": self.quantity,
            "low_stock_threshold": self.low_stock_threshold,
            "supplier_id": self.supplier_id,
            "low_stock": self.quantity <= self.low_stock_threshold,
        }


class Sale(db.Model):
    __tablename__ = "sales"
    sale_id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    items = db.relationship("SaleItem", backref="sale", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "sale_id": self.sale_id,
            "date": self.date.isoformat(),
            "total_amount": float(self.total_amount),
            "user_id": self.user_id,
            "items": [i.to_dict() for i in self.items],
        }


class SaleItem(db.Model):
    __tablename__ = "sale_items"
    sale_item_id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.sale_id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.product_id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)

    def to_dict(self):
        return {
            "sale_item_id": self.sale_item_id,
            "sale_id": self.sale_id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "price": float(self.price),
        }
