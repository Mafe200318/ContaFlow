"""
Email notification service using smtplib (no extra dependencies).
Sends HTML alerts when an automation fails or when daily summaries are due.
Configure via .env:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger("contaflow.email")

SMTP_HOST    = os.getenv("SMTP_HOST",    "smtp.gmail.com")
SMTP_PORT    = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER    = os.getenv("SMTP_USER",    "")
SMTP_PASS    = os.getenv("SMTP_PASS",    "")
NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", "")   # comma-separated recipients


def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an HTML email to a specific address (used for transactional emails like password reset)."""
    if not SMTP_USER or not SMTP_PASS:
        logger.debug("Email skipped: SMTP credentials not configured")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"ContaFlow <{SMTP_USER}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.sendmail(SMTP_USER, [to], msg.as_string())
        logger.info(f"Email sent: {subject} → {to}")
        return True
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False


def _recipients() -> list[str]:
    if not NOTIFY_EMAIL:
        return []
    return [e.strip() for e in NOTIFY_EMAIL.split(",") if e.strip()]


def _send(subject: str, html: str) -> bool:
    """Send an HTML email. Returns True on success."""
    recipients = _recipients()
    if not recipients:
        logger.debug("Email skipped: NOTIFY_EMAIL not configured")
        return False
    if not SMTP_USER or not SMTP_PASS:
        logger.debug("Email skipped: SMTP credentials not configured")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"ContaFlow <{SMTP_USER}>"
        msg["To"]      = ", ".join(recipients)
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.sendmail(SMTP_USER, recipients, msg.as_string())

        logger.info(f"Email sent: {subject} → {recipients}")
        return True
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False


# ── Public helpers ────────────────────────────────────────────────────────────

def notify_automation_error(auto_name: str, error_msg: str, auto_id: int = None) -> bool:
    """Alert when a scheduled automation fails."""
    now   = datetime.now().strftime("%d/%m/%Y %H:%M")
    title = f"⚠ ContaFlow — Error en automatización: {auto_name}"
    html  = f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0B1120;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1120;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141D2E;border-radius:12px;border:1px solid #1E2D45;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a2a45,#0f1a30);padding:24px 32px;border-bottom:1px solid #1E2D45;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;width:36px;height:36px;background:#00D97E;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);text-align:center;line-height:36px;font-weight:800;color:#0B1120;font-size:14px;vertical-align:middle;">CF</div>
                  <span style="font-size:20px;font-weight:700;color:#E8EEF4;margin-left:12px;vertical-align:middle;">ContaFlow</span>
                </td>
                <td align="right" style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;">ALERTA AUTOMÁTICA</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Error badge -->
        <tr>
          <td style="padding:32px 32px 0;">
            <div style="background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.25);border-radius:8px;padding:16px 20px;">
              <div style="font-size:13px;font-weight:700;color:#FF4757;margin-bottom:4px;">⚠ Error en automatización</div>
              <div style="font-size:22px;font-weight:700;color:#E8EEF4;">{auto_name}</div>
            </div>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 14px;background:#0B1120;border-radius:6px 6px 0 0;border-bottom:1px solid #1E2D45;">
                  <span style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;">Mensaje de Error</span><br/>
                  <span style="font-family:monospace;font-size:12px;color:#FF4757;margin-top:4px;display:block;">{error_msg}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;background:#0B1120;border-radius:0 0 6px 6px;">
                  <span style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;">Fecha y Hora</span><br/>
                  <span style="font-family:monospace;font-size:12px;color:#8CA0BA;margin-top:4px;display:block;">{now} (Bogotá)</span>
                </td>
              </tr>
            </table>

            <div style="margin-top:20px;padding:14px 18px;background:rgba(240,165,0,0.07);border:1px solid rgba(240,165,0,0.2);border-radius:8px;font-size:12px;color:#F0A500;">
              💡 Ingresa a ContaFlow para revisar el historial y corregir el error antes de la próxima ejecución.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #1E2D45;">
            <p style="margin:0;font-family:monospace;font-size:10px;color:#2C3E55;text-transform:uppercase;letter-spacing:1px;text-align:center;">
              ContaFlow · Automatización Contable Colombia · Este es un mensaje automático
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return _send(title, html)


def notify_automation_success(auto_name: str, entries_created: int) -> bool:
    """Confirmation when automation runs without errors."""
    now   = datetime.now().strftime("%d/%m/%Y %H:%M")
    title = f"✓ ContaFlow — {auto_name} ejecutada correctamente"
    html  = f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0B1120;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1120;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141D2E;border-radius:12px;border:1px solid #1E2D45;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a2a45,#0f1a30);padding:24px 32px;border-bottom:1px solid #1E2D45;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><span style="font-size:20px;font-weight:700;color:#E8EEF4;">ContaFlow</span></td>
                <td align="right" style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;">EJECUCIÓN OK</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <div style="background:rgba(0,217,126,0.07);border:1px solid rgba(0,217,126,0.2);border-radius:8px;padding:20px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">✓</div>
              <div style="font-size:20px;font-weight:700;color:#00D97E;">{auto_name}</div>
              <div style="font-size:13px;color:#8CA0BA;margin-top:8px;">
                {entries_created} asiento(s) creado(s) · {now} (Bogotá)
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;border-top:1px solid #1E2D45;">
            <p style="margin:0;font-family:monospace;font-size:10px;color:#2C3E55;text-transform:uppercase;letter-spacing:1px;text-align:center;">
              ContaFlow · Automatización Contable Colombia
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return _send(title, html)


def notify_daily_summary(total_ok: int, total_errors: int, total_amount: float) -> bool:
    """Daily digest of all automations (can be scheduled separately)."""
    from decimal import Decimal
    now   = datetime.now().strftime("%d/%m/%Y")
    fmt_n = lambda n: f"${n:,.0f}".replace(",", ".")
    title = f"📊 ContaFlow — Resumen del día {now}"
    html  = f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0B1120;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1120;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141D2E;border-radius:12px;border:1px solid #1E2D45;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a2a45,#0f1a30);padding:24px 32px;border-bottom:1px solid #1E2D45;">
            <span style="font-size:20px;font-weight:700;color:#E8EEF4;">ContaFlow — Resumen {now}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" align="center" style="padding:16px;background:#0B1120;border-radius:8px;">
                  <div style="font-size:28px;font-weight:700;color:#00D97E;">{total_ok}</div>
                  <div style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;margin-top:4px;">Exitosos</div>
                </td>
                <td width="4%"></td>
                <td width="33%" align="center" style="padding:16px;background:#0B1120;border-radius:8px;">
                  <div style="font-size:28px;font-weight:700;color:#FF4757;">{total_errors}</div>
                  <div style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;margin-top:4px;">Errores</div>
                </td>
                <td width="4%"></td>
                <td width="26%" align="center" style="padding:16px;background:#0B1120;border-radius:8px;">
                  <div style="font-size:20px;font-weight:700;color:#F0A500;">{fmt_n(total_amount)}</div>
                  <div style="font-family:monospace;font-size:10px;color:#4A6080;text-transform:uppercase;margin-top:4px;">COP causado</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0;font-family:monospace;font-size:10px;color:#2C3E55;text-transform:uppercase;letter-spacing:1px;text-align:center;">
              ContaFlow · Automatización Contable Colombia
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return _send(title, html)
