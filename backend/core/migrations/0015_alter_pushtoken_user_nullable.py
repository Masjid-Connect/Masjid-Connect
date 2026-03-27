"""Make PushToken.user nullable for anonymous device registrations."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0014_add_password_reset_token"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pushtoken",
            name="user",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional — null for anonymous device registrations.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="push_tokens",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
