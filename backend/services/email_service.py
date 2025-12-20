import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    def send_email(
        smtp_host: str,
        smtp_port: int,
        smtp_username: str,
        smtp_password: str,
        from_email: str,
        from_name: str,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        use_tls: bool = True
    ) -> bool:
        """
        Send an email using SMTP configuration
        
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            if body_text:
                part1 = MIMEText(body_text, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(body_html, 'html')
            msg.attach(part2)
            
            # Connect to SMTP server
            logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port}")
            
            if use_tls:
                # Use STARTTLS
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                # Plain connection
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            
            # Login
            if smtp_username and smtp_password:
                logger.info(f"Logging in as {smtp_username}")
                server.login(smtp_username, smtp_password)
            
            # Send email
            logger.info(f"Sending email to {to_email}")
            server.send_message(msg)
            server.quit()
            
            logger.info("Email sent successfully")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed: {e}")
            raise Exception(f"Authentication failed. Please check your username and password.")
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            raise Exception(f"SMTP error: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise Exception(f"Failed to send email: {str(e)}")

email_service = EmailService()

# Helper functions for notifications
def get_smtp_config(db):
    """Get SMTP configuration from database"""
    from models import SystemConfig
    
    configs = db.query(SystemConfig).filter(
        SystemConfig.category == "communication"
    ).all()
    
    config_dict = {}
    for config in configs:
        try:
            import json
            config_dict[config.key] = json.loads(config.value) if config.value else None
        except:
            config_dict[config.key] = config.value
    
    return config_dict

def send_notification_email(db, to_email: str, subject: str, body_html: str, body_text: str = None):
    """Send a notification email using system SMTP configuration"""
    try:
        config = get_smtp_config(db)
        
        # Check if SMTP is enabled
        smtp_enabled = str(config.get("smtp_enabled", "false")).lower() == "true"
        if not smtp_enabled:
            logger.warning("SMTP is not enabled, skipping email notification")
            return False
        
        smtp_host = config.get("smtp_host")
        smtp_port = int(config.get("smtp_port", 587))
        smtp_username = config.get("smtp_username")
        smtp_password = config.get("smtp_password")
        smtp_from_email = config.get("smtp_from_email", smtp_username)
        smtp_from_name = config.get("smtp_from_name", "AI Sysadmin Agent")
        smtp_use_tls = str(config.get("smtp_use_tls", "true")).lower() == "true"
        
        if not all([smtp_host, smtp_username, smtp_password]):
            logger.warning("SMTP configuration incomplete, skipping email notification")
            return False
        
        email_service.send_email(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_username=smtp_username,
            smtp_password=smtp_password,
            from_email=smtp_from_email,
            from_name=smtp_from_name,
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            use_tls=smtp_use_tls
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send notification email: {e}")
        return False

def notify_superadmins_new_user(db, new_user_email: str, new_user_username: str):
    """Notify superadmins about a new user registration that requires approval"""
    from models import User, RoleType
    
    # Get all superadmins who want to receive new user notifications
    superadmins = db.query(User).filter(
        User.role == RoleType.SUPERADMIN.value,
        User.is_active == True,
        User.notify_new_users == True
    ).all()
    
    if not superadmins:
        logger.info("No superadmins with new user notifications enabled")
        return
    
    subject = f"New User Registration Pending Approval: {new_user_username}"
    
    body_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">New User Registration</h2>
            <p>A new user has registered and is pending approval:</p>
            <ul>
                <li><strong>Username:</strong> {new_user_username}</li>
                <li><strong>Email:</strong> {new_user_email}</li>
            </ul>
            <p>The user's account is currently inactive. Please review and approve or reject this registration from the admin panel.</p>
            <p><a href="/admin" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Admin Panel</a></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
                This is an automated notification from AI Sysadmin Agent.<br>
                You can manage your notification preferences in your user settings.
            </p>
        </body>
    </html>
    """
    
    body_text = f"""
New User Registration

A new user has registered and is pending approval:

Username: {new_user_username}
Email: {new_user_email}

The user's account is currently inactive. Please review and approve or reject this registration from the admin panel.

---
This is an automated notification from AI Sysadmin Agent.
You can manage your notification preferences in your user settings.
    """
    
    for admin in superadmins:
        try:
            send_notification_email(db, admin.email, subject, body_html, body_text)
            logger.info(f"Sent new user notification to {admin.email}")
        except Exception as e:
            logger.error(f"Failed to send notification to {admin.email}: {e}")


def notify_user_approved(db, user_email: str, user_username: str, language: str = 'en'):
    """Notify a user that their account has been approved by a superadmin
    
    Args:
        db: Database session
        user_email: User's email address
        user_username: User's username
        language: Preferred language ('en' or 'es'), defaults to 'en'
    """
    import os
    
    # Get frontend URL from environment or default
    frontend_url = os.getenv('FRONTEND_URL', 'https://testing.sentrait.com.uy')
    login_url = f"{frontend_url}/login"
    
    # Email templates for different languages
    templates = {
        'en': {
            'subject': 'Your Account Has Been Approved - AI Sysadmin Agent',
            'heading': 'Account Approved!',
            'greeting': f'Hello <strong>{user_username}</strong>,',
            'message': 'Great news! Your account has been approved by an administrator and is now active.',
            'access_message': 'You can now log in and start using AI Sysadmin Agent with full access to your assigned permissions.',
            'button_text': 'Log In Now',
            'footer': 'If you have any questions or need assistance, please contact your system administrator.',
            'auto_notice': 'This is an automated notification from AI Sysadmin Agent.'
        },
        'es': {
            'subject': 'Tu Cuenta Ha Sido Aprobada - AI Sysadmin Agent',
            'heading': '¡Cuenta Aprobada!',
            'greeting': f'Hola <strong>{user_username}</strong>,',
            'message': '¡Buenas noticias! Tu cuenta ha sido aprobada por un administrador y ahora está activa.',
            'access_message': 'Ahora puedes iniciar sesión y comenzar a usar AI Sysadmin Agent con acceso completo a tus permisos asignados.',
            'button_text': 'Iniciar Sesión Ahora',
            'footer': 'Si tienes alguna pregunta o necesitas asistencia, por favor contacta a tu administrador del sistema.',
            'auto_notice': 'Esta es una notificación automatizada de AI Sysadmin Agent.'
        }
    }
    
    # Get template for specified language, fallback to English
    template = templates.get(language, templates['en'])
    subject = template['subject']
    
    # HTML body
    body_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">{template['heading']}</h2>
            <p>{template['greeting']}</p>
            <p>{template['message']}</p>
            <p>{template['access_message']}</p>
            <p>
                <a href="{login_url}" 
                   style="background-color: #10b981; color: white; 
                          padding: 10px 20px; text-decoration: none; 
                          border-radius: 5px; display: inline-block;">
                    {template['button_text']}
                </a>
            </p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
                {template['footer']}<br>
                {template['auto_notice']}
            </p>
        </body>
    </html>
    """
    
    # Text body
    body_text = f"""
{template['heading']}

{template['greeting'].replace('<strong>', '').replace('</strong>', '')}

{template['message']}

{template['access_message']}

{login_url}

---
{template['footer']}
{template['auto_notice']}
    """
    
    try:
        send_notification_email(db, user_email, subject, body_html, body_text)
        logger.info(f"Sent account approval notification to {user_email} in {language}")
        return True
    except Exception as e:
        logger.error(f"Failed to send approval notification to {user_email}: {e}")
        return False
