#!/bin/sh
# Run pending Django migrations before starting gunicorn. Without this,
# migrations committed to git land in the image but never apply against
# production — the cause of the 2026-05-10 VersionPolicy outage.
set -e

python manage.py migrate --noinput

# exec is required so gunicorn inherits PID 1 and receives docker stop's
# SIGTERM directly instead of having it trapped by the shell.
exec "$@"
