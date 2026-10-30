import csv
import io

from flask import Blueprint, jsonify, Response
from sqlalchemy import func

from models import db, Product, Sale, SaleItem
from decorators import roles_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/summary", methods=["GET"])
@roles_required("admin")
def summary():
    total_products = Product.query.count()
    total_sales = Sale.query.count()

    revenue = db.session.query(
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).scalar()

    low_stock = Product.query.filter(
        Product.quantity <= Product.low_stock_threshold
    ).all()

    return jsonify({
        "total_products": total_products,
        "total_sales": total_sales,
        "total_revenue": float(revenue),
        "low_stock_products": [p.to_dict() for p in low_stock],
    }), 200


@dashboard_bp.route("/top-products", methods=["GET"])
@roles_required("admin")
def top_products():
    results = (
        db.session.query(
            Product.name,
            func.sum(SaleItem.quantity).label("units_sold"),
        )
        .join(
            SaleItem,
            SaleItem.product_id == Product.product_id,
        )
        .group_by(Product.product_id, Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )

    return jsonify([
        {
            "name": result.name,
            "units_sold": int(result.units_sold),
        }
        for result in results
    ]), 200


@dashboard_bp.route("/export/products", methods=["GET"])
@roles_required("admin")
def export_products_csv():
    products = Product.query.order_by(Product.product_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Product ID",
        "Name",
        "Category",
        "Price",
        "Quantity",
        "Low Stock Threshold",
        "Supplier ID",
    ])

    for product in products:
        writer.writerow([
            product.product_id,
            product.name,
            product.category,
            product.price,
            product.quantity,
            product.low_stock_threshold,
            product.supplier_id,
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=products_report.csv"
        },
    )


@dashboard_bp.route("/export/sales", methods=["GET"])
@roles_required("admin")
def export_sales_csv():
    sales = Sale.query.order_by(Sale.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Sale ID",
        "Date",
        "Total Amount",
        "User ID",
        "Product ID",
        "Quantity",
        "Price",
    ])

    for sale in sales:
        if not sale.items:
            writer.writerow([
                sale.sale_id,
                sale.date,
                sale.total_amount,
                sale.user_id,
                "",
                "",
                "",
            ])

        for item in sale.items:
            writer.writerow([
                sale.sale_id,
                sale.date,
                sale.total_amount,
                sale.user_id,
                item.product_id,
                item.quantity,
                item.price,
            ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=sales_report.csv"
        },
    )