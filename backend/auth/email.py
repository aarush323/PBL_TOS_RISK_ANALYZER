import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
VERIFY_BASE_URL = os.getenv("VERIFY_BASE_URL", "http://localhost:8000")

def send_verification_email(to_email: str, token: str):
    """
    Sends a verification email with a HTML template.
    Uses BackgroundTasks in FastAPI.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"!!! SMTP credentials missing in .env !!! Skipping real email to {to_email}. Sending to console instead.")
        return

    logger.info(f"Initiating real email delivery to {to_email} via {SMTP_HOST}...")

    verify_link = f"{VERIFY_BASE_URL}/auth/verify/{token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your account - Jurist AI"
    msg["From"] = f"Jurist AI <{SMTP_USER}>"
    msg["To"] = to_email

    html_content = f"""
    <html>
      <body style="font-family: 'Inter', sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <h1 style="color: #38bdf8; margin-bottom: 20px;">Welcome to Jurist AI</h1>
          <p style="font-size: 16px; color: #94a3b8; line-height: 1.6;">
            Thank you for joining the elite legal AI platform. Please verify your email to activate your account and start your analysis.
          </p>
          <div style="margin: 40px 0;">
            <a href="{verify_link}" 
               style="background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);">
              Verify Account
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 40px;">
            If you didn't create an account, you can safely ignore this email.<br>
            Verification link expires in 1 hour.
          </p>
        </div>
      </body>
    </html>
    """
    
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Verification email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
