# Generated for Masjid Connect 2026-05-09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_add_mixlr_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="VersionPolicy",
            fields=[
                (
                    "id",
                    models.PositiveSmallIntegerField(
                        default=1, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "ios_minimum",
                    models.CharField(
                        default="1.0.0",
                        help_text="iOS clients below this version trigger `policy_below_minimum`. Semver only (e.g. 1.0.0).",
                        max_length=20,
                    ),
                ),
                (
                    "ios_recommended",
                    models.CharField(
                        default="1.0.0",
                        help_text="iOS clients below this version trigger `policy_below_recommended`. Bump after a release is live in the App Store.",
                        max_length=20,
                    ),
                ),
                (
                    "ios_store_url",
                    models.URLField(
                        default="https://apps.apple.com/app/id0000000000",
                        help_text="Deep link iOS clients open when they tap the update CTA. Replace 0000000000 with the App Store numeric ID once Apple Developer approval lands.",
                    ),
                ),
                (
                    "android_minimum",
                    models.CharField(
                        default="1.0.0",
                        help_text="Android clients below this version trigger `policy_below_minimum`. Semver only.",
                        max_length=20,
                    ),
                ),
                (
                    "android_recommended",
                    models.CharField(
                        default="1.0.0",
                        help_text="Android clients below this version trigger `policy_below_recommended`. Bump after a release is live on Play.",
                        max_length=20,
                    ),
                ),
                (
                    "android_store_url",
                    models.URLField(
                        default="https://play.google.com/store/apps/details?id=app.salafimasjid",
                        help_text="Deep link Android clients open when they tap the update CTA.",
                    ),
                ),
                (
                    "policy_below_minimum",
                    models.CharField(
                        choices=[
                            ("block", "Block (full-screen, non-dismissible)"),
                            ("soft", "Soft (banner only — same as below recommended)"),
                            ("none", "None (no UI shown)"),
                        ],
                        default="block",
                        help_text="What happens to clients on a version below `*_minimum`.",
                        max_length=10,
                    ),
                ),
                (
                    "policy_below_recommended",
                    models.CharField(
                        choices=[
                            ("soft", "Soft (dismissible banner)"),
                            ("none", "None (no UI shown)"),
                        ],
                        default="soft",
                        help_text="What happens to clients on a version at-or-above `*_minimum` but below `*_recommended`.",
                        max_length=10,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Version policy",
                "verbose_name_plural": "Version policy",
            },
        ),
    ]
