"""
Report Service - Generates health check reports with PDF output
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from io import BytesIO
import os
import logging
import json

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from sqlalchemy.orm import Session
from services.diagnostic_service import diagnostic_service
from services.ai_service import ai_service
from services.email_service import send_notification_email, get_smtp_config
from utils.encryption import decrypt_data
import models

logger = logging.getLogger(__name__)

# Reports directory
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


class ReportService:
    """Service for generating and managing health check reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom PDF styles"""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1e40af')
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#1e40af')
        ))
        self.styles.add(ParagraphStyle(
            name='MetricLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.grey
        ))
        self.styles.add(ParagraphStyle(
            name='MetricValue',
            parent=self.styles['Normal'],
            fontSize=12,
            fontName='Helvetica-Bold'
        ))
    
    def gather_comprehensive_diagnostics(self, server: models.Server, db: Session) -> Dict[str, Any]:
        """Gather comprehensive diagnostic data from a server"""
        # Get decrypted credentials
        ssh_password = None
        ssh_key = None
        
        if server.ssh_password:
            try:
                ssh_password = decrypt_data(server.ssh_password)
            except Exception as e:
                logger.warning(f"Could not decrypt SSH password: {e}")
        
        if server.ssh_key_path:
            try:
                ssh_key = decrypt_data(server.ssh_key_path)
            except Exception as e:
                logger.warning(f"Could not decrypt SSH key path: {e}")
        
        # Extended diagnostic commands for comprehensive report
        diagnostics = {
            "server_info": {
                "hostname": server.hostname,
                "ip_address": server.ip_address,
                "os_info": server.os_info,
                "check_time": datetime.now().isoformat()
            },
            "checks": {}
        }
        
        # Build inventory for ansible
        inventory = diagnostic_service._build_inventory(server, ssh_password, ssh_key)
        
        # Comprehensive checks
        checks = [
            ("system_overview", "echo '=== UPTIME ===' && uptime && echo '=== CPU ===' && top -bn1 | grep 'Cpu(s)' && echo '=== MEMORY ===' && free -h && echo '=== LOAD ===' && cat /proc/loadavg"),
            ("disk_usage", "df -h && echo '=== INODES ===' && df -i | head -10"),
            ("top_processes", "ps aux --sort=-%cpu | head -15"),
            ("memory_processes", "ps aux --sort=-%mem | head -10"),
            ("services_status", "systemctl list-units --type=service --state=failed --no-pager 2>/dev/null || echo 'No failed services'"),
            ("recent_errors", "journalctl -p err -n 20 --no-pager 2>/dev/null || tail -50 /var/log/syslog 2>/dev/null || echo 'No log access'"),
            ("network_status", "ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null || echo 'No network info'"),
            ("security_events", "lastlog 2>/dev/null | head -20 || echo 'No lastlog'; echo '=== FAILED LOGINS ===' && grep -i 'failed' /var/log/auth.log 2>/dev/null | tail -10 || echo 'No auth log'"),
            ("installed_services", "systemctl list-units --type=service --state=running --no-pager 2>/dev/null | head -30 || echo 'No systemctl'"),
        ]
        
        for check_name, command in checks:
            try:
                stdout, status, rc = diagnostic_service.ansible.run_command(
                    host_pattern=server.ip_address,
                    module="shell",
                    module_args=command,
                    inventory=inventory
                )
                diagnostics["checks"][check_name] = {
                    "success": rc == 0,
                    "output": stdout.strip()[:2000] if rc == 0 else f"Error: {stdout[:500]}",
                    "exit_code": rc
                }
            except Exception as e:
                logger.error(f"Failed to run check {check_name}: {e}")
                diagnostics["checks"][check_name] = {
                    "success": False,
                    "output": f"Connection error: {str(e)[:200]}",
                    "exit_code": -1
                }
        
        return diagnostics
    
    def generate_ai_analysis(self, diagnostics: Dict[str, Any], db: Session, language: str = "es") -> str:
        """Generate AI analysis of the diagnostic data - formatted as a report, not interactive"""
        from langchain_core.prompts import ChatPromptTemplate
        
        # Format diagnostics for AI
        formatted_data = []
        for check_name, check_data in diagnostics.get("checks", {}).items():
            formatted_data.append(f"=== {check_name.upper()} ===\n{check_data.get('output', 'No data')}\n")
        
        server_info = diagnostics.get("server_info", {})
        
        # Report-specific system prompt (NO interactive elements)
        system_prompt = """Eres un experto en administración de sistemas Linux generando un INFORME FORMAL de salud del servidor.

INSTRUCCIONES CRÍTICAS:
1. Este es un INFORME ESCRITO, NO una conversación interactiva.
2. NO hagas preguntas al lector.
3. NO propongas comandos para ejecutar.
4. NO uses secciones como "Preguntas" o "Próximos pasos interactivos".
5. Escribe en tercera persona de forma objetiva y profesional.

ESTRUCTURA DEL INFORME:

📊 RESUMEN EJECUTIVO
[Breve párrafo con el estado general del servidor: saludable, con advertencias, o crítico]

🔍 ANÁLISIS DETALLADO

**Rendimiento del Sistema:**
[Análisis de CPU, memoria y carga. Indica si los valores son normales o preocupantes.]

**Almacenamiento:**
[Estado del disco, uso de espacio, posibles problemas de capacidad.]

**Servicios y Procesos:**
[Estado de los servicios, procesos que consumen recursos, servicios fallidos si los hay.]

**Red:**
[Puertos abiertos, servicios de red activos, observaciones de conectividad.]

**Seguridad:**
[Eventos de autenticación, intentos de acceso fallidos, observaciones de seguridad.]

⚠️ ALERTAS Y OBSERVACIONES
[Lista de cualquier problema detectado o área que requiere atención. Si no hay problemas, indicar que el sistema está operando normalmente.]

✅ CONCLUSIÓN
[Párrafo final con la evaluación general y cualquier recomendación de mantenimiento preventivo.]

RECUERDA: Esto es un REPORTE, no una conversación. No hagas preguntas. No propongas comandos."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", """Servidor: {hostname}
IP: {ip_address}
Sistema: {os_info}
Fecha del análisis: {check_time}

DATOS DE DIAGNÓSTICO:
{diagnostic_data}

Genera el informe de salud del servidor siguiendo la estructura indicada.""")
        ])
        
        try:
            # Reload AI service config
            ai_service._reload_config(db)
            
            if ai_service.mock_mode:
                return self._generate_mock_report(diagnostics)
            
            chain = prompt | ai_service.llm
            result = chain.invoke({
                "hostname": server_info.get("hostname", "Unknown"),
                "ip_address": server_info.get("ip_address", "Unknown"),
                "os_info": server_info.get("os_info", "Unknown"),
                "check_time": server_info.get("check_time", datetime.now().isoformat()),
                "diagnostic_data": "\n".join(formatted_data)
            })
            
            return result.content if hasattr(result, 'content') else str(result)
            
        except Exception as e:
            logger.error(f"Failed to generate AI analysis: {e}")
            return self._generate_mock_report(diagnostics)
    
    def _generate_mock_report(self, diagnostics: Dict[str, Any]) -> str:
        """Generate a basic report when AI is unavailable"""
        metrics = self.extract_metrics(diagnostics)
        server_info = diagnostics.get("server_info", {})
        
        return f"""📊 RESUMEN EJECUTIVO

El servidor {server_info.get('hostname', 'Unknown')} ha sido analizado. A continuación se presenta el estado actual del sistema.

🔍 ANÁLISIS DETALLADO

**Rendimiento del Sistema:**
- Uso de CPU: {metrics.get('cpu_usage', 'N/A')}
- Uso de Memoria: {metrics.get('memory_usage', 'N/A')}

**Almacenamiento:**
- Uso de Disco: {metrics.get('disk_usage', 'N/A')}

**Servicios:**
- Estado: {'Todos los servicios operando normalmente' if metrics.get('services_status') == 'all_ok' else 'Se detectaron servicios con problemas'}

✅ CONCLUSIÓN

Este informe fue generado automáticamente. Para un análisis más detallado, configure las credenciales de IA en el panel de administración."""
    
    def compare_with_previous(self, current_data: Dict, previous_report: Optional[models.HealthCheckReport]) -> str:
        """Compare current diagnostic data with previous report"""
        if not previous_report or not previous_report.report_data:
            return "Este es el primer reporte para este servidor. No hay datos previos para comparar."
        
        comparison = []
        prev_data = previous_report.report_data
        
        # Compare key metrics
        metrics_to_compare = ["cpu_usage", "memory_usage", "disk_usage"]
        
        for metric in metrics_to_compare:
            current_val = current_data.get(metric, "N/A")
            prev_val = getattr(previous_report, metric, "N/A")
            if current_val != prev_val:
                comparison.append(f"• {metric}: {prev_val} → {current_val}")
        
        # Check for new errors
        current_errors = current_data.get("checks", {}).get("recent_errors", {}).get("output", "")
        prev_errors = prev_data.get("checks", {}).get("recent_errors", {}).get("output", "")
        
        if current_errors != prev_errors:
            comparison.append("• Se detectaron cambios en los logs de errores recientes")
        
        # Check for service changes
        current_services = current_data.get("checks", {}).get("services_status", {}).get("output", "")
        prev_services = prev_data.get("checks", {}).get("services_status", {}).get("output", "")
        
        if current_services != prev_services:
            comparison.append("• Se detectaron cambios en el estado de servicios")
        
        if comparison:
            return "Cambios detectados respecto al reporte anterior:\n" + "\n".join(comparison)
        else:
            return "No se detectaron cambios significativos respecto al reporte anterior."
    
    def extract_metrics(self, diagnostics: Dict[str, Any]) -> Dict[str, str]:
        """Extract key metrics from diagnostics for summary"""
        metrics = {
            "cpu_usage": "N/A",
            "memory_usage": "N/A",
            "disk_usage": "N/A",
            "services_status": "unknown"
        }
        
        checks = diagnostics.get("checks", {})
        
        # Extract CPU
        system_overview = checks.get("system_overview", {}).get("output", "")
        if "Cpu(s)" in system_overview:
            try:
                # Extract idle percentage
                for line in system_overview.split("\n"):
                    if "Cpu(s)" in line:
                        # Find idle value
                        parts = line.split(",")
                        for part in parts:
                            if "id" in part.lower():
                                idle = float(part.strip().split()[0])
                                metrics["cpu_usage"] = f"{100-idle:.1f}%"
                                break
            except:
                pass
        
        # Extract Memory
        if "Mem:" in system_overview:
            try:
                for line in system_overview.split("\n"):
                    if "Mem:" in line:
                        parts = line.split()
                        if len(parts) >= 3:
                            metrics["memory_usage"] = f"{parts[2]} / {parts[1]}"
                            break
            except:
                pass
        
        # Extract Disk
        disk_output = checks.get("disk_usage", {}).get("output", "")
        if disk_output:
            try:
                for line in disk_output.split("\n"):
                    if "/" in line and "%" in line:
                        parts = line.split()
                        for part in parts:
                            if "%" in part:
                                metrics["disk_usage"] = part
                                break
                        break
            except:
                pass
        
        # Check services
        services_output = checks.get("services_status", {}).get("output", "")
        if "No failed" in services_output or services_output.strip() == "":
            metrics["services_status"] = "all_ok"
        else:
            metrics["services_status"] = "issues_found"
        
        return metrics
    
    def generate_pdf_report(
        self,
        server_hostname: str,
        diagnostics: Dict[str, Any],
        ai_analysis: str,
        comparison: str,
        report_id: int
    ) -> str:
        """Generate PDF report and return filename"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"health_report_{server_hostname}_{timestamp}_{report_id}.pdf"
        filepath = os.path.join(REPORTS_DIR, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        
        # Title
        story.append(Paragraph(f"Reporte de Salud del Servidor", self.styles['ReportTitle']))
        story.append(Paragraph(f"{server_hostname}", self.styles['Heading2']))
        story.append(Paragraph(f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['MetricLabel']))
        story.append(Spacer(1, 20))
        
        # Server Info
        server_info = diagnostics.get("server_info", {})
        info_data = [
            ["Hostname", server_info.get("hostname", "N/A")],
            ["IP Address", server_info.get("ip_address", "N/A")],
            ["Sistema Operativo", server_info.get("os_info", "N/A")],
        ]
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f4f8')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Metrics Summary
        metrics = self.extract_metrics(diagnostics)
        story.append(Paragraph("Resumen de Métricas", self.styles['SectionHeader']))
        metrics_data = [
            ["CPU", metrics.get("cpu_usage", "N/A")],
            ["Memoria", metrics.get("memory_usage", "N/A")],
            ["Disco", metrics.get("disk_usage", "N/A")],
            ["Servicios", "✓ OK" if metrics.get("services_status") == "all_ok" else "⚠ Issues"],
        ]
        metrics_table = Table(metrics_data, colWidths=[2*inch, 4*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 20))
        
        # Comparison
        if comparison:
            story.append(Paragraph("Comparación con Reporte Anterior", self.styles['SectionHeader']))
            story.append(Paragraph(comparison.replace("\n", "<br/>"), self.styles['Normal']))
            story.append(Spacer(1, 15))
        
        # AI Analysis
        story.append(Paragraph("Análisis de IA", self.styles['SectionHeader']))
        # Clean up AI analysis for PDF
        clean_analysis = ai_analysis.replace("**", "").replace("```", "").replace("*", "")
        story.append(Paragraph(clean_analysis[:3000].replace("\n", "<br/>"), self.styles['Normal']))
        
        story.append(PageBreak())
        
        # Detailed Diagnostics
        story.append(Paragraph("Datos de Diagnóstico Detallados", self.styles['SectionHeader']))
        
        for check_name, check_data in diagnostics.get("checks", {}).items():
            story.append(Paragraph(check_name.replace("_", " ").title(), self.styles['Heading3']))
            output = check_data.get("output", "No data")[:1000]
            # Sanitize for PDF
            output = output.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(f"<pre>{output}</pre>", self.styles['Code'] if 'Code' in self.styles else self.styles['Normal']))
            story.append(Spacer(1, 10))
        
        # Build PDF
        try:
            doc.build(story)
            logger.info(f"Generated PDF report: {filepath}")
            return filename
        except Exception as e:
            logger.error(f"Failed to generate PDF: {e}")
            raise
    
    def send_report_email(
        self,
        db: Session,
        recipients: List[str],
        server_hostname: str,
        pdf_filename: str,
        summary: str
    ) -> bool:
        """Send report via email with PDF attachment"""
        from email.mime.base import MIMEBase
        from email import encoders
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        try:
            config = get_smtp_config(db)
            
            # Check if SMTP is enabled
            smtp_enabled = str(config.get("smtp_enabled", "false")).lower() == "true"
            if not smtp_enabled:
                logger.warning("SMTP is not enabled, skipping email")
                return False
            
            smtp_host = config.get("smtp_host")
            smtp_port = int(config.get("smtp_port", 587))
            smtp_username = config.get("smtp_username")
            smtp_password = config.get("smtp_password")
            smtp_from_email = config.get("smtp_from_email", smtp_username)
            smtp_from_name = config.get("smtp_from_name", "AI Sysadmin Agent")
            smtp_use_tls = str(config.get("smtp_use_tls", "true")).lower() == "true"
            
            if not all([smtp_host, smtp_username, smtp_password]):
                logger.warning("SMTP configuration incomplete")
                return False
            
            # Create email
            msg = MIMEMultipart()
            msg['Subject'] = f"[Health Report] {server_hostname} - {datetime.now().strftime('%Y-%m-%d')}"
            msg['From'] = f"{smtp_from_name} <{smtp_from_email}>"
            msg['To'] = ", ".join(recipients)
            
            # Email body
            body_html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #1e40af;">Reporte de Salud del Servidor</h2>
                    <p><strong>Servidor:</strong> {server_hostname}</p>
                    <p><strong>Fecha:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <hr>
                    <p>{summary[:500]}...</p>
                    <p>📎 El reporte completo en PDF está adjunto a este correo.</p>
                    <hr>
                    <p style="color: #6b7280; font-size: 12px;">
                        Este es un reporte automático generado por AI Sysadmin Agent.
                    </p>
                </body>
            </html>
            """
            msg.attach(MIMEText(body_html, 'html'))
            
            # Attach PDF
            pdf_path = os.path.join(REPORTS_DIR, pdf_filename)
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    part = MIMEBase("application", "pdf")
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={pdf_filename}"
                    )
                    msg.attach(part)
            
            # Send
            if smtp_use_tls:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            
            for recipient in recipients:
                server.sendmail(smtp_from_email, recipient.strip(), msg.as_string())
            
            server.quit()
            logger.info(f"Sent health report email to {recipients}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send report email: {e}")
            return False


# Singleton instance
report_service = ReportService()
