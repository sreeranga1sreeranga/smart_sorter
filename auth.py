import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import bcrypt
from db import store_otp

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode('utf-8'), salt).decode('utf-8')

def check_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def send_otp_email(to_email: str):
    smtp_email = os.environ.get("SMTP_EMAIL", "").strip().strip('"').strip("'")
    smtp_password = os.environ.get("SMTP_PASSWORD", "").replace(" ", "").strip().strip('"').strip("'")

    if not smtp_email or not smtp_password:
        return False, "SMTP credentials missing. Please set SMTP_EMAIL and SMTP_PASSWORD."

    otp = str(random.randint(100000, 999999))
    store_otp(to_email, otp)

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = f"Smart Sorter Security <{smtp_email}>"
        msg['To'] = to_email
        msg['Subject'] = f"{otp} is your verification code"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #16a34a; margin-top: 0;">Smart Sorter Security</h2>
            <p style="color: #334155; font-size: 15px;">Your one-time password reset code is:</p>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">
                {otp}
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 20px;">This code expires in 10 minutes. If you did not request this code, you can ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(msg)
        server.quit()

        return True, f"Verification OTP has been sent to {to_email}."
    except Exception as e:
        return False, f"Failed to send email: {e}"