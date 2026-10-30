from flask import Blueprint, request, jsonify
from models import db, Product
from decorators import roles_required

products_bp = Blueprint("products", __name__)


@products_bp.route("", methods=["POST"])
@roles_required("admin")
def create_product():
    data = request.get_json() or {}

    if not data.get("name") or data.get("price") is None:
        return jsonify({"error": "name and price are required"}), 400

    product = Product(
        name=data["name"],
        category=data.get("category"),
        price=data["price"],
        quantity=data.get("quantity", 0),
        low_stock_threshold=data.get("low_stock_threshold", 5),
        supplier_id=data.get("supplier_id"),
    )

    db.session.add(product)
    db.session.commit()

    return jsonify(product.to_dict()), 201


@products_bp.route("", methods=["GET"])
@roles_required("admin", "staff")
def get_products():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)
    search = request.args.get("search", "", type=str).strip()
    category = request.args.get("category", "", type=str).strip()

    if page < 1 or limit < 1:
        return jsonify({"error": "page and limit must be positive"}), 400

    query = Product.query

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    if category:
        query = query.filter(Product.category == category)

    total = query.count()

    products = (
        query.order_by(Product.product_id)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return jsonify({
        "items": [p.to_dict() for p in products],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max((total + limit - 1) // limit, 1),
    }), 200


@products_bp.route("/<int:product_id>", methods=["GET"])
@roles_required("admin", "staff")
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict()), 200


@products_bp.route("/<int:product_id>", methods=["PUT"])
@roles_required("admin")
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}

    for field in [
        "name",
        "category",
        "price",
        "quantity",
        "low_stock_threshold",
        "supplier_id",
    ]:
        if field in data:
            setattr(product, field, data[field])

    db.session.commit()

    return jsonify(product.to_dict()), 200


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@roles_required("admin")
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)

    try:
        db.session.delete(product)
        db.session.commit()

        return jsonify({
            "message": "Product deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()

        # Log the actual database error in the Flask terminal.
        print("DELETE PRODUCT ERROR:", repr(e))

        return jsonify({
            "error": "Product could not be deleted",
            "message": "Check the Flask server logs for the database error"
        }), 500
