from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db
from routes.auth import auth_bp
from routes.products import products_bp
from routes.suppliers import suppliers_bp
from routes.sales import sales_bp
from routes.dashboard import dashboard_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow the deployed Netlify frontend to access the Flask API,
    # including requests containing the JWT Authorization header.
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
    "https://inventorymgtsys.netlify.app",
    "https://localhost"
]
            }
        },
        methods=[
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],
        allow_headers=[
            "Content-Type",
            "Authorization"
        ]
    )

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(suppliers_bp, url_prefix="/api/suppliers")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"}), 200

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=8080)
