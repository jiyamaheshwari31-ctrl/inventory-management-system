from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from models import db, Product, Sale, SaleItem

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    total_products = Product.query.count()
    total_sales = Sale.query.count()
    revenue = db.session.query(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
    low_stock = Product.query.filter(Product.quantity <= Product.low_stock_threshold).all()

    return jsonify({
        "total_products": total_products,
        "total_sales": total_sales,
        "total_revenue": float(revenue),
        "low_stock_products": [p.to_dict() for p in low_stock],
    }), 200


@dashboard_bp.route("/top-products", methods=["GET"])
@jwt_required()
def top_products():
    results = (
        db.session.query(
            Product.name,
            func.sum(SaleItem.quantity).label("units_sold"),
        )
        .join(SaleItem, SaleItem.product_id == Product.product_id)
        .group_by(Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )
    return jsonify([{"name": r.name, "units_sold": int(r.units_sold)} for r in results]), 200
