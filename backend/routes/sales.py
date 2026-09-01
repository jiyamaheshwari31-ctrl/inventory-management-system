from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Sale, SaleItem, Product

sales_bp = Blueprint("sales", __name__)


@sales_bp.route("", methods=["POST"])
@jwt_required()
def create_sale():
    """
    Expected body:
    {
      "items": [ {"product_id": 1, "quantity": 2}, {"product_id": 3, "quantity": 1} ]
    }
    """
    data = request.get_json() or {}
    items = data.get("items", [])
    if not items:
        return jsonify({"error": "At least one item is required"}), 400

    user_id = int(get_jwt_identity())
    sale = Sale(user_id=user_id, total_amount=0)
    db.session.add(sale)

    total = 0
    for item in items:
        product = Product.query.get(item["product_id"])
        if not product:
            db.session.rollback()
            return jsonify({"error": f"Product {item['product_id']} not found"}), 404
        qty = item["quantity"]
        if product.quantity < qty:
            db.session.rollback()
            return jsonify({"error": f"Insufficient stock for {product.name}"}), 400

        product.quantity -= qty
        line_total = float(product.price) * qty
        total += line_total
        db.session.add(SaleItem(sale=sale, product_id=product.product_id, quantity=qty, price=product.price))

    sale.total_amount = total
    db.session.commit()
    return jsonify(sale.to_dict()), 201


@sales_bp.route("", methods=["GET"])
@jwt_required()
def get_sales():
    return jsonify([s.to_dict() for s in Sale.query.order_by(Sale.date.desc()).all()]), 200


@sales_bp.route("/<int:sale_id>", methods=["GET"])
@jwt_required()
def get_sale(sale_id):
    sale = Sale.query.get_or_404(sale_id)
    return jsonify(sale.to_dict()), 200


@sales_bp.route("/<int:sale_id>", methods=["DELETE"])
@jwt_required()
def delete_sale(sale_id):
    sale = Sale.query.get_or_404(sale_id)
    db.session.delete(sale)
    db.session.commit()
    return jsonify({"message": "Sale deleted"}), 200
