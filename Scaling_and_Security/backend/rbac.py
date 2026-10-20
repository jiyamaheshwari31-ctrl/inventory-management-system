from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def require_role(*allowed_roles):
    """
    Restricts a route to logged-in users whose JWT role claim is one of allowed_roles.
    Usage: @require_role("admin")
    Must be used together with @jwt_required() is NOT needed separately —
    this decorator verifies the JWT itself, then checks the role claim.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
