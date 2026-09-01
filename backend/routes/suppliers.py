from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, Supplier

suppliers_bp = Blueprint("suppliers", __name__)


@suppliers_bp.route("", methods=["POST"])
@jwt_required()
def create_supplier():
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    supplier = Supplier(name=data["name"], phone=data.get("phone"), email=data.get("email"))
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201


@suppliers_bp.route("", methods=["GET"])
@jwt_required()
def get_suppliers():
    return jsonify([s.to_dict() for s in Supplier.query.all()]), 200


@suppliers_bp.route("/<int:supplier_id>", methods=["GET"])
@jwt_required()
def get_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    return jsonify(supplier.to_dict()), 200


@suppliers_bp.route("/<int:supplier_id>", methods=["PUT"])
@jwt_required()
def update_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    data = request.get_json() or {}
    for field in ["name", "phone", "email"]:
        if field in data:
            setattr(supplier, field, data[field])
    db.session.commit()
    return jsonify(supplier.to_dict()), 200


@suppliers_bp.route("/<int:supplier_id>", methods=["DELETE"])
@jwt_required()
def delete_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier deleted"}), 200
