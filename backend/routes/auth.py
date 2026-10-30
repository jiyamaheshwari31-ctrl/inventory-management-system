import io
from datetime import timedelta

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

import pyotp
import qrcode

from models import db, User

auth_bp = Blueprint("auth", __name__)


# --------------------------------------------------
# REGISTER
# --------------------------------------------------


@auth_bp.route("/register", methods=["POST"])
def register():
    return jsonify({
        "error": "Public registration is disabled",
        "message": "Contact your administrator for an account"
    }), 403



# --------------------------------------------------
# LOGIN - PASSWORD CHECK
# --------------------------------------------------

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    user = User.query.filter_by(
        email=email.strip().lower()
    ).first()

    if not user or not user.check_password(password):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    # MFA-enabled accounts must verify their authenticator code
    # before receiving a normal application access token.
    if user.mfa_enabled:
        challenge_token = create_access_token(
            identity=str(user.user_id),
            additional_claims={
                "mfa_pending": True,
            },
            expires_delta=timedelta(minutes=5),
        )

        return jsonify({
            "mfa_required": True,
            "message": "Enter the 6-digit code from your authenticator app",
            "mfa_token": challenge_token,
        }), 200

    # Accounts that have not enabled MFA can sign in normally.
    # Enable MFA for these accounts if MFA must be mandatory.
    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={
            "role": user.role,
            "name": user.name,
            "mfa_pending": False,
        },
    )

    return jsonify({
        "mfa_required": False,
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200


# --------------------------------------------------
# LOGIN - VERIFY AUTHENTICATOR CODE
# --------------------------------------------------

@auth_bp.route("/mfa/verify-login", methods=["POST"])
@jwt_required()
def mfa_verify_login():
    # This endpoint accepts the short-lived challenge token
    # returned by /login, not a normal application token.
    claims = get_jwt()

    if claims.get("mfa_pending") is not True:
        return jsonify({
            "error": "A valid MFA login challenge is required"
        }), 403

    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.mfa_enabled or not user.totp_secret:
        return jsonify({
            "error": "MFA is not configured for this account"
        }), 400

    data = request.get_json() or {}
    otp = str(data.get("totp_code", "")).strip()

    if not otp.isdigit() or len(otp) != 6:
        return jsonify({
            "error": "Enter a valid 6-digit authenticator code"
        }), 400

    if not pyotp.TOTP(user.totp_secret).verify(
        otp,
        valid_window=1,
    ):
        return jsonify({
            "error": "Invalid authenticator code"
        }), 401

    # Only after successful OTP verification do we issue
    # the normal application access token.
    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={
            "role": user.role,
            "name": user.name,
            "mfa_pending": False,
        },
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200


# --------------------------------------------------
# ADMIN MFA SETUP
# --------------------------------------------------

@auth_bp.route("/mfa/setup", methods=["POST"])
@jwt_required()
def mfa_setup():
    claims = get_jwt()

    if claims.get("mfa_pending") is True:
        return jsonify({
            "error": "Complete MFA login verification first"
        }), 403

    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role != "admin":
        return jsonify({
            "error": "Admin access required"
        }), 403

    if user.mfa_enabled:
        return jsonify({
            "error": "MFA is already enabled"
        }), 409

    # Generate a secret only when beginning a new setup.
    secret = pyotp.random_base32()
    user.totp_secret = secret

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "MFA setup initiated. Scan the QR code, then verify it.",
        "qr_endpoint": "/api/auth/mfa/qr",
    }), 200


# --------------------------------------------------
# ADMIN MFA QR CODE
# --------------------------------------------------

@auth_bp.route("/mfa/qr", methods=["GET"])
@jwt_required()
def admin_mfa_qr():
    claims = get_jwt()

    if claims.get("mfa_pending") is True:
        return jsonify({
            "error": "Complete MFA login verification first"
        }), 403

    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role != "admin":
        return jsonify({
            "error": "Admin access required"
        }), 403

    if not user.totp_secret:
        return jsonify({
            "error": "Run MFA setup first"
        }), 400

    provisioning_uri = pyotp.TOTP(
        user.totp_secret
    ).provisioning_uri(
        name=user.email,
        issuer_name="Inventory Management System",
    )

    qr_image = qrcode.make(provisioning_uri)

    image_buffer = io.BytesIO()
    qr_image.save(image_buffer, format="PNG")
    image_buffer.seek(0)

    return send_file(
        image_buffer,
        mimetype="image/png",
    )


# --------------------------------------------------
# ADMIN MFA SETUP - VERIFY CODE AND ENABLE MFA
# --------------------------------------------------

@auth_bp.route("/mfa/verify-setup", methods=["POST"])
@jwt_required()
def mfa_verify_setup():
    claims = get_jwt()

    if claims.get("mfa_pending") is True:
        return jsonify({
            "error": "Complete MFA login verification first"
        }), 403

    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role != "admin":
        return jsonify({
            "error": "Admin access required"
        }), 403

    if not user.totp_secret:
        return jsonify({
            "error": "Run MFA setup first"
        }), 400

    if user.mfa_enabled:
        return jsonify({
            "message": "MFA is already enabled"
        }), 409

    data = request.get_json() or {}
    otp = str(data.get("totp_code", "")).strip()

    if not otp.isdigit() or len(otp) != 6:
        return jsonify({
            "error": "Enter a valid 6-digit OTP"
        }), 400

    if not pyotp.TOTP(user.totp_secret).verify(
        otp,
        valid_window=1,
    ):
        return jsonify({
            "error": "Invalid OTP"
        }), 401

    user.mfa_enabled = True

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "Admin MFA enabled successfully",
        "mfa_enabled": True,
    }), 200
