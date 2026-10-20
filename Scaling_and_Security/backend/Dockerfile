# Hardened image: slim base, no compilers, non-root user, no pip cache.
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Every dependency ships a prebuilt wheel (PyMySQL is pure Python), so no
# gcc / libmysqlclient-dev is needed - fewer packages = fewer CVEs.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Unprivileged user: a container escape no longer lands as root.
RUN useradd --system --no-create-home --uid 10001 appuser
COPY --chown=appuser:appuser . .
USER appuser

EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--access-logfile", "-", "app:app"]
