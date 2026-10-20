import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config
from extensions import limiter
from models import db
from routes.auth import auth_bp
from routes.products import products_bp
from routes.suppliers import suppliers_bp
from routes.sales import sales_bp
from routes.dashboard import dashboard_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Behind Nginx every request arrives from the proxy's IP. Trust ONE hop of
    # X-Forwarded-For so rate limiting counts the real client, not Nginx.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    CORS(app)
    db.init_app(app)
    JWTManager(app)

    limiter.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(suppliers_bp, url_prefix="/api/suppliers")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    # Lets you SEE load balancing working: every response carries which
    # container instance served it, via INSTANCE_NAME set in docker-compose.yml.
    @app.after_request
    def add_instance_header(response):
        response.headers["X-Served-By"] = os.environ.get("INSTANCE_NAME", "local")
        return response

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "served_by": os.environ.get("INSTANCE_NAME", "local")}), 200

    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=8080)
