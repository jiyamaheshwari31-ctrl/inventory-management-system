from functools import wraps

from flask import jsonify
from flask_jwt_extended import (
    verify_jwt_in_request,
    get_jwt,
    get_jwt_identity,
)

from models import db, User


def roles_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Require a valid JWT. Missing or invalid tokens are rejected.
            verify_jwt_in_request()

            claims = get_jwt()

            # A password-verified MFA challenge is NOT an access token.
            if claims.get("mfa_pending") is True:
                return jsonify({
                    "error": "MFA verification required",
                    "message": "Verify your authenticator code before accessing this resource",
                }), 403

            # Resolve the current account and role from the database.
            try:
                user_id = int(get_jwt_identity())
            except (TypeError, ValueError):
                return jsonify({
                    "error": "Invalid token identity",
                }), 401

            user = db.session.get(User, user_id)

            if not user:
                return jsonify({
                    "error": "User account not found",
                }), 401

            if user.role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": "You do not have permission to perform this action",
                }), 403

            return fn(*args, **kwargs)

        return wrapper
    return decorator