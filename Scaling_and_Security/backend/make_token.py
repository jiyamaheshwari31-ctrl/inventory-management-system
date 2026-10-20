"""
Prints a JWT for an existing user so load tests don't need the login + TOTP flow.
Usage:  python make_token.py admin@shop.com
"""
import sys
from flask_jwt_extended import create_access_token
from app import create_app
from models import User

app = create_app()
with app.app_context():
    user = User.query.filter_by(email=sys.argv[1]).first()
    if not user:
        sys.exit("No such user")
    print(create_access_token(identity=str(user.user_id),
                              additional_claims={"role": user.role, "name": user.name}))
