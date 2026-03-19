"""Management command to send a test push notification to a user's devices."""

from django.core.management.base import BaseCommand, CommandError

from core.models import PushToken, User
from core.push import send_push_notifications


class Command(BaseCommand):
    help = "Send a test push notification to a user by email address."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Email of the user to notify.")
        parser.add_argument(
            "--title",
            default="Test Notification",
            help="Notification title (default: 'Test Notification').",
        )
        parser.add_argument(
            "--body",
            default="If you see this, push notifications are working!",
            help="Notification body text.",
        )

    def handle(self, *args, **options):
        email = options["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f"No user found with email: {email}")

        tokens = list(PushToken.objects.filter(user=user).values_list("token", flat=True))

        if not tokens:
            raise CommandError(
                f"User '{email}' has no registered push tokens. "
                "Make sure they have opened the app and allowed notifications."
            )

        self.stdout.write(f"Sending test push to {len(tokens)} device(s) for {email}...")

        result = send_push_notifications(
            tokens=tokens,
            title=options["title"],
            body=options["body"],
            data={"type": "test"},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {result['sent']} sent, {result['failed']} failed, "
                f"{len(result['pruned'])} pruned."
            )
        )
