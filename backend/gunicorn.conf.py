# Gunicorn configuration for Masjid Connect
# Docs: https://docs.gunicorn.org/en/stable/settings.html

import multiprocessing

# ------------------------------------------------------------------
# Server socket
# ------------------------------------------------------------------
bind = "0.0.0.0:8000"

# ------------------------------------------------------------------
# Workers
# ------------------------------------------------------------------
# 3 workers × 4 threads = 12 concurrent requests (~60 req/s capacity).
# Memory footprint ~450 MB — fits within 512M Docker limit.
workers = 3
worker_class = "gthread"
threads = 4

# ------------------------------------------------------------------
# Timeouts
# ------------------------------------------------------------------
timeout = 30            # Kill a worker if it takes more than 30 seconds (prevents slow-loris DoS)
graceful_timeout = 30   # Time to finish requests before forced shutdown
keepalive = 5           # Keep connections open for 5 seconds

# ------------------------------------------------------------------
# Restart workers periodically to prevent memory leaks
# ------------------------------------------------------------------
max_requests = 1000         # Restart a worker after 1000 requests
max_requests_jitter = 50    # Add randomness so workers don't restart at the same time

# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
accesslog = "-"    # Print access logs to stdout (Docker captures them)
errorlog = "-"     # Print error logs to stderr (Docker captures them)
loglevel = "info"

# ------------------------------------------------------------------
# Security
# ------------------------------------------------------------------
# Limit request sizes to prevent abuse
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190
