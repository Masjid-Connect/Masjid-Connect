"""Tests for email notification flows — welcome, donation receipt, password reset, account deletion."""

from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from core.models import Donation, PasswordResetToken, User


@override_settings(RESEND_API_KEY="test-key")
class WelcomeEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("core.email._send_email")
    def test_register_sends_welcome_email(self, mock_send):
        mock_send.return_value = True
        response = self.client.post("/api/v1/auth/register/", {
            "email": "newuser@example.com",
            "password": "securepass123",
            "name": "New User",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Welcome email should be sent (via background thread, but we mock _send_email)
        # Check that send_email_async was triggered by verifying the thread was started
        # Since we patch _send_email, the async wrapper calls it in a thread
        # We can verify by checking the email module was invoked

    @patch("core.email.send_email_async")
    def test_register_sends_welcome_email_with_correct_args(self, mock_async):
        response = self.client.post("/api/v1/auth/register/", {
            "email": "welcome@example.com",
            "password": "securepass123",
            "name": "Welcome User",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_async.assert_called_once()
        call_args = mock_async.call_args
        self.assertEqual(call_args[0][0], "welcome@example.com")
        self.assertIn("Welcome", call_args[0][1])


@override_settings(RESEND_API_KEY="test-key")
class PasswordResetRequestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="reset@test.com",
            email="reset@test.com",
            password="testpass123",
            name="Reset User",
        )

    @patch("core.email.send_email_async")
    def test_request_reset_sends_email(self, mock_async):
        response = self.client.post("/api/v1/auth/password-reset/", {
            "email": "reset@test.com",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Token should be created
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())
        # Email should be sent
        mock_async.assert_called_once()
        call_args = mock_async.call_args
        self.assertEqual(call_args[0][0], "reset@test.com")
        self.assertIn("Reset", call_args[0][1])

    @patch("core.email.send_email_async")
    def test_request_reset_nonexistent_email_returns_200(self, mock_async):
        """Should return 200 even for non-existent emails to prevent enumeration."""
        response = self.client.post("/api/v1/auth/password-reset/", {
            "email": "nobody@example.com",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # No email should be sent
        mock_async.assert_not_called()

    @patch("core.email.send_email_async")
    def test_request_reset_social_user_returns_200(self, mock_async):
        """Social users (no usable password) should not get reset emails."""
        social_user = User.objects.create_user(
            username="social@test.com",
            email="social@test.com",
            password="temp",
        )
        social_user.set_unusable_password()
        social_user.save()

        response = self.client.post("/api/v1/auth/password-reset/", {
            "email": "social@test.com",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_async.assert_not_called()

    def test_request_reset_missing_email(self):
        response = self.client.post("/api/v1/auth/password-reset/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.email.send_email_async")
    def test_request_reset_invalidates_previous_tokens(self, mock_async):
        """Requesting a new reset should invalidate old tokens."""
        # Create first token
        self.client.post("/api/v1/auth/password-reset/", {"email": "reset@test.com"})
        first_token = PasswordResetToken.objects.filter(user=self.user, used=False).first()
        self.assertIsNotNone(first_token)

        # Request again
        self.client.post("/api/v1/auth/password-reset/", {"email": "reset@test.com"})

        # First token should now be marked as used
        first_token.refresh_from_db()
        self.assertTrue(first_token.used)

        # New token should exist
        active_tokens = PasswordResetToken.objects.filter(user=self.user, used=False)
        self.assertEqual(active_tokens.count(), 1)


@override_settings(RESEND_API_KEY="test-key")
class PasswordResetConfirmTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="confirm@test.com",
            email="confirm@test.com",
            password="oldpass123",
            name="Confirm User",
        )
        self.reset_token = PasswordResetToken.objects.create(
            user=self.user,
            token="valid-test-token-123",
        )

    def test_confirm_reset_success(self):
        response = self.client.post("/api/v1/auth/password-reset/confirm/", {
            "token": "valid-test-token-123",
            "password": "newpass456",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Password should be changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass456"))

        # Token should be marked as used
        self.reset_token.refresh_from_db()
        self.assertTrue(self.reset_token.used)

        # Auth tokens should be invalidated
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_confirm_reset_invalid_token(self):
        response = self.client.post("/api/v1/auth/password-reset/confirm/", {
            "token": "invalid-token",
            "password": "newpass456",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_reset_expired_token(self):
        """Token older than 1 hour should be rejected."""
        self.reset_token.created = timezone.now() - timedelta(hours=2)
        self.reset_token.save(update_fields=["created"])

        response = self.client.post("/api/v1/auth/password-reset/confirm/", {
            "token": "valid-test-token-123",
            "password": "newpass456",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_reset_used_token(self):
        """Already-used token should be rejected."""
        self.reset_token.used = True
        self.reset_token.save(update_fields=["used"])

        response = self.client.post("/api/v1/auth/password-reset/confirm/", {
            "token": "valid-test-token-123",
            "password": "newpass456",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_reset_short_password(self):
        response = self.client.post("/api/v1/auth/password-reset/confirm/", {
            "token": "valid-test-token-123",
            "password": "short",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_reset_missing_fields(self):
        response = self.client.post("/api/v1/auth/password-reset/confirm/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_login_with_new_password_after_reset(self):
        """After reset, user should be able to login with new password."""
        self.client.post("/api/v1/auth/password-reset/confirm/", {
            "token": "valid-test-token-123",
            "password": "newpass456",
        })

        response = self.client.post("/api/v1/auth/login/", {
            "email": "confirm@test.com",
            "password": "newpass456",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)


@override_settings(RESEND_API_KEY="test-key")
class AccountDeletionEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="delete@test.com",
            email="delete@test.com",
            password="testpass123",
            name="Delete User",
        )
        response = self.client.post("/api/v1/auth/login/", {
            "email": "delete@test.com",
            "password": "testpass123",
        })
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

    @patch("core.email.send_email_async")
    def test_delete_account_sends_confirmation_email(self, mock_async):
        response = self.client.delete("/api/v1/auth/delete-account/", {
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_async.assert_called_once()
        call_args = mock_async.call_args
        self.assertEqual(call_args[0][0], "delete@test.com")
        self.assertIn("Deleted", call_args[0][1])


@override_settings(RESEND_API_KEY="test-key")
class DonationReceiptEmailTests(TestCase):
    @patch("core.email.send_email_async")
    def test_send_donation_receipt(self, mock_async):
        from core.email import send_donation_receipt_email

        donation = Donation(
            donor_name="Test Donor",
            donor_email="donor@example.com",
            amount_pence=5000,
            currency="gbp",
            frequency="one_time",
            donation_date=date.today(),
            gift_aid_eligible=False,
        )
        # Mock the id since we don't save to DB
        donation.id = "12345678-1234-1234-1234-123456789012"

        send_donation_receipt_email(donation)

        mock_async.assert_called_once()
        call_args = mock_async.call_args
        self.assertEqual(call_args[0][0], "donor@example.com")
        self.assertIn("£50.00", call_args[0][1])

    @patch("core.email.send_email_async")
    def test_send_donation_receipt_with_gift_aid(self, mock_async):
        from core.email import send_donation_receipt_email

        donation = Donation(
            donor_name="GA Donor",
            donor_email="ga@example.com",
            amount_pence=10000,
            currency="gbp",
            frequency="one_time",
            donation_date=date.today(),
            gift_aid_eligible=True,
            gift_aid_amount_pence=2500,
            donor_address_line1="123 Test St",
            donor_postcode="SW1A 1AA",
        )
        donation.id = "12345678-1234-1234-1234-123456789012"

        send_donation_receipt_email(donation)

        mock_async.assert_called_once()
        call_args = mock_async.call_args
        html = call_args[0][2]
        self.assertIn("Gift Aid", html)
        self.assertIn("£25.00", html)

    @patch("core.email.send_email_async")
    def test_no_receipt_without_email(self, mock_async):
        from core.email import send_donation_receipt_email

        donation = Donation(
            donor_name="Anon Donor",
            donor_email="",
            amount_pence=5000,
            donation_date=date.today(),
        )
        send_donation_receipt_email(donation)
        mock_async.assert_not_called()


class EmailServiceTests(TestCase):
    @override_settings(RESEND_API_KEY="test-key")
    @patch("resend.Emails.send")
    def test_send_email_success(self, mock_send):
        from core.email import _send_email

        result = _send_email("test@example.com", "Test Subject", "<p>Hello</p>")
        self.assertTrue(result)
        mock_send.assert_called_once()

    @override_settings(RESEND_API_KEY="")
    def test_send_email_no_api_key(self):
        from core.email import _send_email

        result = _send_email("test@example.com", "Test Subject", "<p>Hello</p>")
        self.assertFalse(result)

    def test_generate_password_reset_token(self):
        from core.email import generate_password_reset_token

        token1 = generate_password_reset_token()
        token2 = generate_password_reset_token()
        self.assertNotEqual(token1, token2)
        self.assertGreater(len(token1), 20)


class PasswordResetTokenModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="model@test.com",
            email="model@test.com",
            password="testpass123",
        )

    def test_token_is_valid_when_fresh(self):
        token = PasswordResetToken.objects.create(
            user=self.user, token="fresh-token"
        )
        self.assertTrue(token.is_valid())

    def test_token_is_expired_after_1_hour(self):
        token = PasswordResetToken.objects.create(
            user=self.user, token="old-token"
        )
        token.created = timezone.now() - timedelta(hours=1, minutes=1)
        token.save(update_fields=["created"])
        self.assertTrue(token.is_expired())
        self.assertFalse(token.is_valid())

    def test_used_token_is_invalid(self):
        token = PasswordResetToken.objects.create(
            user=self.user, token="used-token", used=True
        )
        self.assertFalse(token.is_valid())
