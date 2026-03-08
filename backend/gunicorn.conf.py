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
# Formula: 2 × CPU cores + 1. For a 1-vCPU droplet, 3 is ideal.
# If you upgrade to a 2-vCPU droplet, change this to 5.
workers = 3
worker_class = "gthread"
threads = 2

# ------------------------------------------------------------------
# Timeouts
# ------------------------------------------------------------------
timeout = 120           # Kill a worker if it takes more than 120 seconds
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
