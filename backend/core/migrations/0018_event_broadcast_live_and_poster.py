# Generated for Masjid Connect 2026-05-15
# Adds Event.is_broadcast_live (flag) and Event.poster_image (optional asset).
# Additive only — both fields have safe defaults; no data backfill required.

import core.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_add_version_policy"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="is_broadcast_live",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Tick if this event will be streamed live on Mixlr. When the "
                    "Mixlr broadcast is active and the current time is inside "
                    "this event's window, the mobile app shows a gold LIVE pill "
                    "on the event row and routes a tap straight to the live "
                    "player."
                ),
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="poster_image",
            field=models.ImageField(
                blank=True,
                help_text=(
                    "Optional poster image for this event (JPEG, PNG, or WebP, "
                    "max 5 MB). Shown as a thumbnail on the event row and at "
                    "full width on the event detail screen."
                ),
                upload_to="events/posters/%Y/%m/",
                validators=[core.models.validate_image_file],
            ),
        ),
    ]
