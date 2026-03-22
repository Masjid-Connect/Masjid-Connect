# Generated manually — adds database index to Announcement.expires_at
# for efficient filtering of expired announcements.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_alter_announcement_author_alter_announcement_body_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="announcement",
            name="expires_at",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text="Leave blank to keep visible indefinitely. Set a date to auto-hide after that time.",
                null=True,
            ),
        ),
    ]
