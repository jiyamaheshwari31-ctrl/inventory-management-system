"""
Run once to create tables and seed a default admin user.
Usage: python init_db.py
"""
from app import create_app
from models import db, User

app = create_app()

with app.app_context():
    db.create_all()

    if not User.query.filter_by(email="admin@shop.com").first():
        admin = User(name="Admin", email="admin@shop.com", role="admin")
        admin.set_password("Admin@123")
        db.session.add(admin)
        db.session.commit()
        print("Seeded admin user -> email: admin@shop.com | password: Admin@123")
    else:
        print("Admin user already exists.")
