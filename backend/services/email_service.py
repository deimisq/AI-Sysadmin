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
