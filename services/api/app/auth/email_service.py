"""
HealthCore — Email Service (Resend)
=====================================
Transactional email delivery for password reset and other notifications.

Uses the Resend SDK v2 (https://resend.com/docs/api-reference/introduction).
The API key is loaded from the environment variable ``RESEND_API_KEY``.
"""

import logging
import resend

from app.core.config import RESEND_API_KEY, FRONTEND_URL

logger = logging.getLogger(__name__)


def _init_resend() -> None:
    """Initialize the Resend SDK with the API key (idempotent)."""
    if not resend.api_key:
        resend.api_key = RESEND_API_KEY


# ── Email templates ────────────────────────────────────────────────

RESET_EMAIL_HTML = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;background-color:#f4f4f5;color:#1f2937}}
  .container{{max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}}
  .header{{background:#2563eb;padding:24px 32px}}
  .header h1{{margin:0;font-size:20px;font-weight:600;color:#fff}}
  .body{{padding:32px}}
  .body p{{font-size:15px;line-height:1.6;margin:0 0 16px}}
  .btn{{display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;font-size:15px}}
  .btn:hover{{background:#1d4ed8}}
  .footer{{padding:24px 32px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb}}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>HealthCore</h1></div>
  <div class="body">
    <p><strong>Password reset request</strong></p>
    <p>We received a request to reset your HealthCore account password. Click the button below to set a new one. This link expires in <strong>{expires_minutes} minutes</strong>.</p>
    <p style="text-align:center;margin:24px 0"><a href="{reset_url}" class="btn">Reset Password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>HealthCore — Clinician Onboarding Platform</p>
  </div>
</div>
</body>
</html>"""

RESET_EMAIL_TEXT = """Password reset request
=========================

We received a request to reset your HealthCore account password.

Open the link below to set a new one (expires in {expires_minutes} minutes):

{reset_url}

If you did not request this, you can safely ignore this email.
"""


# ── Public API ─────────────────────────────────────────────────────

def send_reset_email(to_email: str, reset_token: str, expires_minutes: int = 15) -> bool:
    """
    Send a password reset email to the user.

    Args:
        to_email: The recipient's email address.
        reset_token: The raw JWT reset token to include in the URL.
        expires_minutes: Token expiry window (for display purposes).

    Returns:
        True if the email was accepted for delivery, False otherwise.
    """
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    html = RESET_EMAIL_HTML.format(reset_url=reset_url, expires_minutes=expires_minutes)
    text = RESET_EMAIL_TEXT.format(reset_url=reset_url, expires_minutes=expires_minutes)

    try:
        _init_resend()
        resend.Emails.send(
            params={
                "from": "HealthCore <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "HealthCore — Password Reset",
                "html": html,
                "text": text,
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False