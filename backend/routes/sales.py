from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from models import db, Sale, SaleItem, Product
from decorators import roles_required

sales_bp = Blueprint("sales", __name__)


@sales_bp.route("", methods=["POST"])
@roles_required("admin", "staff")
def create_sale():
    """
    Expected body:
    {
        "items": [
            {"product_id": 1, "quantity": 2},
            {"product_id": 3, "quantity": 1}
        ]
    }
    """
    data = request.get_json() or {}
    items = data.get("items", [])

    if not isinstance(items, list) or not items:
        return jsonify({"error": "At least one item is required"}), 400

    user_id = int(get_jwt_identity())
    sale = Sale(user_id=user_id, total_amount=0)

    db.session.add(sale)

    total = 0

    try:
        for item in items:
            if not isinstance(item, dict):
                db.session.rollback()
                return jsonify({"error": "Invalid sale item"}), 400

            product_id = item.get("product_id")
            qty = item.get("quantity")

            if (
                not isinstance(product_id, int)
                or isinstance(product_id, bool)
                or not isinstance(qty, int)
                or isinstance(qty, bool)
                or qty <= 0
            ):
                db.session.rollback()
                return jsonify({
                    "error": "Each item requires a valid product_id and positive integer quantity"
                }), 400

            product = Product.query.filter_by(
                product_id=product_id
            ).with_for_update().first()

            if not product:
                db.session.rollback()
                return jsonify({
                    "error": f"Product {product_id} not found"
                }), 404

            if product.quantity < qty:
                db.session.rollback()
                return jsonify({
                    "error": f"Insufficient stock for {product.name}"
                }), 400

            product.quantity -= qty

            line_total = float(product.price) * qty
            total += line_total

            sale.items.append(
                SaleItem(
                    product_id=product.product_id,
                    quantity=qty,
                    price=product.price,
                )
            )

        sale.total_amount = total
        db.session.commit()

        return jsonify(sale.to_dict()), 201

    except Exception:
        db.session.rollback()
        raise


@sales_bp.route("", methods=["GET"])
@roles_required("admin", "staff")
def get_sales():
    sales = Sale.query.order_by(Sale.date.desc()).all()
    return jsonify([s.to_dict() for s in sales]), 200

@sales_bp.route("/<int:sale_id>", methods=["GET"])
@roles_required("admin")
def get_sale(sale_id):
    sale = Sale.query.get_or_404(sale_id)
    return jsonify(sale.to_dict()), 200


@sales_bp.route("/<int:sale_id>", methods=["DELETE"])
@roles_required("admin")
def delete_sale(sale_id):
    sale = Sale.query.get_or_404(sale_id)

    try:
        # Restore inventory before deleting the sale.
        for item in sale.items:
            product = Product.query.filter_by(
                product_id=item.product_id
            ).with_for_update().first()

            if product:
                product.quantity += item.quantity

        db.session.delete(sale)
        db.session.commit()

        return jsonify({
            "message": "Sale deleted and inventory restored"
        }), 200

    except Exception:
        db.session.rollback()
        raise