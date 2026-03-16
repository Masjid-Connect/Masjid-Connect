# =============================================================
# Masjid Connect — Django Backend
# =============================================================
# This Dockerfile builds a production-ready image.
#
# HOW IT WORKS (for beginners):
#   1. Starts from a small Linux + Python image
#   2. Installs the database driver (PostgreSQL)
#   3. Installs Python packages (Django, etc.)
#   4. Copies your app code into the image
#   5. Collects static files (CSS/JS for admin panel)
#   6. Runs the app with Gunicorn (a production web server)
# =============================================================

# ----- Stage 1: Build dependencies -----
FROM python:3.12-slim AS builder

# Install system packages needed to build Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (Docker caches this layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ----- Stage 2: Production image -----
FROM python:3.12-slim

# Install runtime libraries (PostgreSQL driver + curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Create a non-root user (security best practice)
RUN useradd --create-home --shell /bin/bash mosque
USER mosque
WORKDIR /home/mosque/app

# Copy application code
COPY --chown=mosque:mosque . .

# Collect static files at build time (needs SECRET_KEY but value doesn't matter)
RUN SECRET_KEY=build-placeholder python manage.py collectstatic --noinput

# Expose the port Gunicorn listens on
EXPOSE 8000

# Health check — curl follows redirects and Coolify requires curl/wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/health/ || exit 1

# Start Gunicorn using our config file
CMD ["gunicorn", "config.wsgi", "--config", "gunicorn.conf.py"]
