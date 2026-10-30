from getpass import getpass

from app import app
from models import db, User

with app.app_context():
    email = input("Admin email: ").strip().lower()
    name = input("Admin name: ").strip()
    password = getpass("Admin password (minimum 8 characters): ")

    if not email or not name:
        print("ERROR: Email and name are required.")
    elif len(password) < 8:
        print("ERROR: Password must be at least 8 characters.")
    elif User.query.filter_by(email=email).first():
        print("ERROR: This email already exists. No changes made.")
    else:
        try:
            admin = User(name=name, email=email, role="admin")
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            print("Admin account created successfully!")
        except Exception:
            db.session.rollback()
            print("ERROR: Admin creation failed. Database changes rolled back.")
            raise
