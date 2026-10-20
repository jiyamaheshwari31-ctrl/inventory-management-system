import pyotp
import segno
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request,
)
from models import db, User
from extensions import limiter

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    required = ["name", "email", "password"]
    if not all(k in data for k in required):
        return jsonify({"error": "name, email, password are required"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    # Public sign-up can only ever create "staff". Only a logged-in admin may
    # create another admin - otherwise anyone could register themselves as admin.
    role = "staff"
    if data.get("role") == "admin":
        verify_jwt_in_request(optional=True)
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Only an admin can create admin users"}), 403
        role = "admin"

    user = User(name=data["name"], email=data["email"], role=role)
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")  # brute-force / credential-stuffing defence
def login():
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Invalid email or password"}), 401
    db.session.commit()  # persists the transparent legacy-hash -> bcrypt upgrade, if one happened

    # If MFA is enabled, password alone is not enough — ask for the TOTP code next.
    if user.mfa_enabled:
        if "totp_code" not in data:
            return jsonify({"mfa_required": True, "message": "Enter your 6-digit authenticator code"}), 200
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(data["totp_code"], valid_window=1):
            return jsonify({"error": "Invalid or expired authenticator code"}), 401

    token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role, "name": user.name},
    )
    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@auth_bp.route("/mfa/setup", methods=["POST"])
@jwt_required()
def mfa_setup():
    """Generates a new TOTP secret + QR code for the logged-in user to scan
    in Google/Microsoft Authenticator. MFA is not enabled yet — that happens
    only after they confirm a code in /mfa/verify."""
    user = User.query.get_or_404(int(get_jwt_identity()))
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.session.commit()

    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Inventory Manager")
    qr_data_uri = segno.make(uri).svg_data_uri(scale=6)  # <img src="..."> ready

    return jsonify({"secret": secret, "otpauth_uri": uri, "qr_code": qr_data_uri}), 200


@auth_bp.route("/mfa/verify", methods=["POST"])
@jwt_required()
def mfa_verify():
    """User submits the 6-digit code shown in their authenticator app to confirm
    setup worked. Only after this succeeds does mfa_enabled flip to True."""
    data = request.get_json() or {}
    user = User.query.get_or_404(int(get_jwt_identity()))
    if not user.totp_secret:
        return jsonify({"error": "Call /mfa/setup first"}), 400

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(data.get("totp_code", ""), valid_window=1):
        return jsonify({"error": "Invalid code"}), 401

    user.mfa_enabled = True
    db.session.commit()
    return jsonify({"message": "MFA enabled"}), 200


@auth_bp.route("/mfa/disable", methods=["POST"])
@jwt_required()
def mfa_disable():
    user = User.query.get_or_404(int(get_jwt_identity()))
    user.mfa_enabled = False
    user.totp_secret = None
    db.session.commit()
    return jsonify({"message": "MFA disabled"}), 200
