import csv
import io
from flask import Blueprint, jsonify, Response
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

@dashboard_bp.route("/export/products", methods=["GET"])
@jwt_required()
def export_products_csv():
    products = Product.query.order_by(Product.product_id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Product ID", "Name", "Category", "Price", "Quantity", "Low Stock Threshold", "Supplier ID"])
    for p in products:
        writer.writerow([p.product_id, p.name, p.category, p.price, p.quantity, p.low_stock_threshold, p.supplier_id])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=products_report.csv"},
    )


@dashboard_bp.route("/export/sales", methods=["GET"])
@jwt_required()
def export_sales_csv():
    sales = Sale.query.order_by(Sale.date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Sale ID", "Date", "Total Amount", "User ID", "Product ID", "Quantity", "Price"])
    for s in sales:
        if not s.items:
            writer.writerow([s.sale_id, s.date, s.total_amount, s.user_id, "", "", ""])
        for item in s.items:
            writer.writerow([s.sale_id, s.date, s.total_amount, s.user_id, item.product_id, item.quantity, item.price])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_report.csv"},
    )