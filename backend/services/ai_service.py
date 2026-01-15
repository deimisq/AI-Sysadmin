from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_aws import ChatBedrock, BedrockEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from sqlalchemy.orm import Session
from sqlalchemy import text
from settings import settings
import models
import logging
import re
import os

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.embeddings = None
        
        # Check which provider to use
        if self.provider == "gemini" and settings.GOOGLE_API_KEY:
            logger.info("Using Google Gemini as LLM provider")
            self.mock_mode = False
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0
            )
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.GOOGLE_API_KEY
            )
        elif self.provider == "openai" and settings.OPENAI_API_KEY:
            logger.info("Using OpenAI as LLM provider")
            self.mock_mode = False
            self.llm = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY, 
                model="gpt-4o", 
                temperature=0
            )
            self.embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)
        elif self.provider == "bedrock":
            logger.info("Using Amazon Bedrock as LLM provider")
            
            # Try to get token from database first (admin configuration)
            bedrock_token = settings.AWS_BEARER_TOKEN_BEDROCK
            aws_region = settings.AWS_REGION
            
            try:
                from database import SessionLocal
                db = SessionLocal()
                configs = db.query(models.SystemConfig).filter(
                    models.SystemConfig.category == "ai"
                ).all()
                config_dict = {c.key: c.value for c in configs}
                db.close()
                
                # Use DB values if available
                if config_dict.get("aws_bearer_token_bedrock"):
                    bedrock_token = config_dict["aws_bearer_token_bedrock"]
                    logger.info("Using Bedrock token from database configuration")
                if config_dict.get("aws_region"):
                    aws_region = config_dict["aws_region"]
            except Exception as e:
                logger.warning(f"Could not read DB config at startup: {e}")
            
            # Ensure the token is in os.environ for boto3 to pick it up
            if bedrock_token:
                os.environ["AWS_BEARER_TOKEN_BEDROCK"] = bedrock_token
            
            self.mock_mode = False
            self.llm = ChatBedrock(
                model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
                model_kwargs={"temperature": 0},
                region_name=aws_region
            )
            self.embeddings = BedrockEmbeddings(
                model_id="amazon.titan-embed-text-v1",
                region_name=aws_region
            )
        elif self.provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            logger.info("Using Anthropic API as LLM provider")
            self.mock_mode = False
            self.llm = ChatAnthropic(
                model="claude-3-5-sonnet-20240620",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0
            )
            # Anthropic doesn't provide embeddings, use mock or fallback
            self.embeddings = None
        else:
            logger.warning(f"No valid API key found for provider '{self.provider}'. Using Mock Mode.")
            self.mock_mode = True

    def get_embedding(self, text: str) -> list[float]:
        if self.mock_mode or not self.embeddings:
            return [0.0] * 1536  # Mock embeddings (1536 dims for PGVector compatibility)
        return self.embeddings.embed_query(text)

    def search_knowledge_base(self, db: Session, query: str, limit: int = 3):
        """
        Search for similar problems in the knowledge base using vector similarity.
        """
        try:
            query_embedding = self.get_embedding(query)
            
            # PGVector search using L2 distance (<-> operator) or Cosine distance (<=> operator)
            # We use cosine distance here (<=>)
            results = db.query(models.KnowledgeBase).order_by(
                models.KnowledgeBase.embedding.cosine_distance(query_embedding)
            ).limit(limit).all()
            
            return results
        except Exception as e:
            # If embeddings fail (e.g., quota exceeded), return empty results
            # The AI can still analyze without RAG context
            logger.warning(f"Knowledge base search failed: {str(e)[:200]}")
            return []

    def _extract_command(self, response: str) -> str:
        """
        Extract the actual command from AI response, removing markdown formatting.
        Looks for commands in code blocks or after specific markers.
        """
        # Try to find command in code blocks first (```bash ... ```)
        # Improved regex to handle optional newlines and language identifiers
        code_block_pattern = r'```(?:bash|sh)?\s*(.*?)```'
        code_blocks = re.findall(code_block_pattern, response, re.DOTALL)
        if code_blocks:
            # Return the first code block, stripped
            # Filter out blocks that are clearly not commands (e.g. JSON output in analysis) if possible,
            # but usually the first block in the "Command" section is what we want.
            # For now, taking the first one is standard, but we rely on the prompt to put the command at the end.
            # Actually, let's look for the LAST code block if there are multiple, as the analysis might contain snippets?
            # No, the prompt asks for the command at the end. Let's stick to finding the block explicitly associated with the command section if possible.
            
            # Better strategy: Look for the block specifically under the "Command" header if it exists
            if "⚙️ Comando" in response or "Command" in response:
                # Try to find a code block appearing AFTER the command header
                parts = re.split(r'⚙️ Comando|Command \(if applicable\):', response)
                if len(parts) > 1:
                    command_part = parts[-1]
                    cmd_blocks = re.findall(code_block_pattern, command_part, re.DOTALL)
                    if cmd_blocks:
                        return cmd_blocks[0].strip()

            # Fallback: return the last code block (often the proposed command is at the end)
            # or the first one if it's the only one.
            return code_blocks[-1].strip()
        
        # Try to find after "Command to Execute:" or similar markers
        command_patterns = [
            r'\*\*Command to Execute\*\*:\s*`([^`]+)`',
            r'\*\*Command to Execute\*\*:\s*(.+?)(?:\n|$)',
            r'Command to Execute:\s*`([^`]+)`',
            r'Command to Execute:\s*(.+?)(?:\n|$)',
            r'Execute:\s*`([^`]+)`',
            r'Run:\s*`([^`]+)`',
            r'⚙️ Comando(?:\s*\(.*?\))?:\s*`([^`]+)`',
            r'⚙️ Comando(?:\s*\(.*?\))?:\s*(.+?)(?:\n|$)',
        ]
        
        for pattern in command_patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                cmd = match.group(1).strip()
                # Remove markdown formatting
                cmd = re.sub(r'\*\*', '', cmd)
                cmd = re.sub(r'`', '', cmd)
                return cmd
        
        # If no command found, return None
        return None

    def _reload_config(self, db: Session):
        """
        Reloads AI configuration from the database to support runtime changes.
        """
        try:
            configs = db.query(models.SystemConfig).filter(models.SystemConfig.category == "ai").all()
            config_dict = {c.key: c.value for c in configs}
            
            # Get provider from DB or fallback to settings
            provider = config_dict.get("llm_provider", settings.LLM_PROVIDER).lower()
            
            # Get keys from DB or fallback to settings
            anthropic_key = config_dict.get("anthropic_api_key") or settings.ANTHROPIC_API_KEY
            openai_key = config_dict.get("openai_api_key") or settings.OPENAI_API_KEY
            google_key = config_dict.get("google_api_key") or settings.GOOGLE_API_KEY
            
            # Re-initialize LLM based on current config
            if provider == "anthropic" and anthropic_key:
                # Check if we need to update (simple check: if not correct type or mock mode)
                if self.mock_mode or not isinstance(self.llm, ChatAnthropic):
                    logger.info("Reloading AI Service: Switching to Anthropic")
                    self.mock_mode = False
                    self.llm = ChatAnthropic(
                        model="claude-3-5-sonnet-20240620",
                        api_key=anthropic_key,
                        temperature=0
                    )
                    self.embeddings = None
                    
            elif provider == "openai" and openai_key:
                if self.mock_mode or not isinstance(self.llm, ChatOpenAI):
                    logger.info("Reloading AI Service: Switching to OpenAI")
                    self.mock_mode = False
                    self.llm = ChatOpenAI(
                        api_key=openai_key, 
                        model="gpt-4o", 
                        temperature=0
                    )
                    self.embeddings = OpenAIEmbeddings(api_key=openai_key)

            elif provider == "gemini" and google_key:
                if self.mock_mode or not isinstance(self.llm, ChatGoogleGenerativeAI):
                    logger.info("Reloading AI Service: Switching to Gemini")
                    self.mock_mode = False
                    self.llm = ChatGoogleGenerativeAI(
                        model="gemini-2.0-flash",
                        google_api_key=google_key,
                        temperature=0
                    )
                    self.embeddings = GoogleGenerativeAIEmbeddings(
                        model="models/embedding-001",
                        google_api_key=google_key
                    )
            
            
            elif provider == "bedrock":
                # Get bearer token from DB or fallback to settings
                bearer_token = config_dict.get("aws_bearer_token_bedrock") or settings.AWS_BEARER_TOKEN_BEDROCK
                aws_region = config_dict.get("aws_region") or settings.AWS_REGION
                
                if bearer_token:
                    # Always update the environment variable with DB token
                    current_env_token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK", "")
                    token_changed = current_env_token != bearer_token
                    
                    if self.mock_mode or not isinstance(self.llm, ChatBedrock) or token_changed:
                        if token_changed:
                            logger.info("Reloading AI Service: Bedrock token changed, reinitializing...")
                        else:
                            logger.info("Reloading AI Service: Switching to Bedrock")
                        
                        os.environ["AWS_BEARER_TOKEN_BEDROCK"] = bearer_token
                        self.mock_mode = False
                        self.llm = ChatBedrock(
                            model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
                            model_kwargs={"temperature": 0},
                            region_name=aws_region
                        )
                        self.embeddings = BedrockEmbeddings(
                            model_id="amazon.titan-embed-text-v1",
                            region_name=aws_region
                        )

        except Exception as e:
            logger.error(f"Failed to reload AI config: {e}")

    def analyze_problem(self, db: Session, problem_description: str, server_info: str, language: str = "en", history: list = None) -> dict:
        """
        Analyzes a problem using RAG and proposes a solution.
        Now with improved conversational analysis and problem verification.
        Supports multimodal input (images).
        """
        # Reload config to ensure we are using the latest settings
        self._reload_config(db)

        # Check for embedded image
        image_data = None
        clean_description = problem_description
        
        # Regex to find image attachment
        img_match = re.search(r'\[Image attached: .*?\]\nBase64: (data:image\/[a-zA-Z]+;base64,[^\s]+)', problem_description)
        if not img_match:
             # Try without data URI prefix if it's raw base64
             img_match = re.search(r'\[Image attached: .*?\]\nBase64: ([^\s]+)', problem_description)

        if img_match:
            b64_string = img_match.group(1)
            image_data = b64_string
            # Remove the long base64 string from description to avoid token waste in text part
            clean_description = problem_description.replace(img_match.group(0), "[Image Attached]")

        # 1. Retrieve relevant context
        similar_cases = self.search_knowledge_base(db, clean_description)
        
        context_str = ""
        for case in similar_cases:
            context_str += f"- Problem: {case.problem_description}\n  Solution: {case.solution_description}\n  Command: {case.command_executed}\n\n"
            
        if not context_str:
            context_str = "No previous similar cases found."

        # Language-specific instructions
        language_instruction = ""
        if language == "es":
            language_instruction = "\n\n**IMPORTANTE: Debes responder COMPLETAMENTE en ESPAÑOL. Toda tu respuesta, análisis, recomendaciones y explicaciones deben estar en español.**"
        else:
            language_instruction = "\n\n**IMPORTANT: You must respond COMPLETELY in ENGLISH. All your response, analysis, recommendations and explanations must be in English.**"

        # 2. Construct Enhanced Prompt for conversational analysis
        # Build system message with language instruction
        system_message = """You are an expert Sysadmin AI Agent with deep Linux expertise. Your role is to provide COMPREHENSIVE SERVER HEALTH ANALYSIS.

CRITICAL INSTRUCTIONS:

1. **HOLISTIC SYSTEM ANALYSIS (MOST IMPORTANT)**:
   - When the user asks for "server status", "system state", or general health checks, provide a COMPLETE OVERVIEW covering ALL major aspects:
     * **CPU & Load**: Current usage, load average, any anomalies
     * **Memory & Swap**: Usage, available, swap status
     * **Disk Space**: Usage across partitions, any near-capacity warnings
     * **Network**: Connectivity, open ports, unusual traffic
     * **Security**: Failed login attempts, suspicious processes, firewall status
     * **Services**: Overall service health, any failed units
     * **System Uptime**: How long the server has been running
   - Do NOT fixate on a single service or application. Give a broad picture first.
   - Only drill down into specifics if the user explicitly asks about a particular service.

2. **CONTEXT & CONVERSATION HISTORY**:
   - You are in a PERSISTENT CHAT SESSION with a sysadmin.
   - **FIRST MESSAGE**: Provide the full HOLISTIC status summary as defined above.
   - **FOLLOW-UP MESSAGES**: 
     * **DO NOT** repeat the full status summary unless the status has critically changed or the user asks for it.
     * Answer the specific question or analyze the specific command output provided.
     * Be concise. Don't re-introduce yourself or the server specs every time. Only say "Resumen del sistema" if requested or vastly different.

3. **ANALYZE DATA INTELLIGENTLY (FILTER NOISE)**:
   - You will receive diagnostic data (CPU, memory, processes).
   - **WARNING**: Diagnostic commands themselves (like `top`, `ps`, `grep`, `bash`) often show up as high-CPU processes for a split second. **IGNORE THEM**. Do not report "High CPU on bash/ps" unless it's sustained.
   - Look for REAL anomalies: sustained high load, out of memory, disk full, specific error logs.

4. **STRUCTURE YOUR RESPONSE**:
   
   **🔍 System Health Overview:**
   [Provide a comprehensive summary covering CPU, Memory, Disk, Network, Security, and Services]
   
   **💡 Key Findings:**
   [Highlight anything noteworthy - both good and concerning]
   
   **🎯 Recommendations:**
   [Actionable suggestions based on findings]
   
   **💬 Questions/Next Steps:**
   [Clarifying questions if needed]
   
   **⚙️ Command (if applicable):**
   [Provide commands for deeper investigation if needed]

5. **COMMAND GUIDELINES**:
   - For GENERAL health checks, propose comprehensive diagnostic commands that cover multiple areas.
   - **SINGLE EXECUTABLE BLOCK**: Combine multiple checks using `&&` or `;`.
   - **DO NOT** provide multiple separate code blocks for the command.
   - **DO NOT** include explanations inside the code block.
   - Always wrap the command in a bash code block:
   ```bash
   your-command-here
   ```

6. **GENERAL HEALTH CHECK COMMANDS**:
   When the user asks for general server status, a good comprehensive command would check:
   - System uptime and load
   - Memory usage
   - Disk usage
   - Failed services
   - Recent security events
   Example: `uptime && free -h && df -h && systemctl --failed && lastlog | head -20`

Remember: You are a helpful senior sysadmin. When asked for general status, give a COMPLETE picture. Only focus on specifics when explicitly asked.""" + language_instruction

        # 3. Invoke LLM
        try:
            if self.mock_mode:
                # Enhanced Rule-Based "Mock" Mode for Demo purposes
                lower_prob = clean_description.lower()
                
                # Default response
                analysis_text = "Based on the diagnostic data, the system load appears stable. However, to address your specific request, we should run a targeted command."
                rec_text = "Run the proposed command to gather more specific details."
                cmd = "ps aux --sort=-%cpu | head -10"
                
                # Rule-based logic
                if any(x in lower_prob for x in ["port", "puerto", "listen", "escucha", "network", "red"]):
                    analysis_text = "To analyze network connectivity and open ports, we need to inspect the socket statistics. `netstat` or `ss` will reveal which services are listening."
                    rec_text = "Check open ports and listening services."
                    cmd = "sudo netstat -tulpn || sudo ss -tulpn"
                    
                elif any(x in lower_prob for x in ["disk", "disco", "space", "espacio", "full", "lleno"]):
                    analysis_text = "Disk usage issues can cause system instability. We should check the filesystem usage to identify any partitions that are near capacity."
                    rec_text = "Inspect disk usage across all mounted filesystems."
                    cmd = "df -h"
                    
                elif any(x in lower_prob for x in ["memory", "memoria", "ram", "oom"]):
                    analysis_text = "Memory analysis requires looking at both usage and available swap. We should also identify which processes are consuming the most RAM."
                    rec_text = "Check memory usage and top memory-consuming processes."
                    cmd = "free -h && ps aux --sort=-%mem | head -10"
                    
                elif any(x in lower_prob for x in ["cpu", "load", "carga", "slow", "lento"]):
                    analysis_text = "High CPU load or system slowness can be caused by runaway processes. Let's check the process list sorted by CPU usage."
                    rec_text = "Identify processes consuming the most CPU."
                    cmd = "top -b -n 1 | head -20"
                    
                elif any(x in lower_prob for x in ["log", "error", "fail", "fallo"]):
                    analysis_text = "System logs are the best place to find error messages. We should check the syslog or journal for recent critical events."
                    rec_text = "Read the tail of the system logs."
                    cmd = "sudo tail -n 50 /var/log/syslog || sudo journalctl -n 50"
                    
                elif any(x in lower_prob for x in ["update", "upgrade", "actualiz"]):
                    analysis_text = "Keeping the system updated is crucial for security. We should check for available package updates."
                    rec_text = "Update package lists and check for upgrades."
                    cmd = "sudo apt update"

                response = (
                    f"**🔍 Analysis of Current State:**\n"
                    f"{analysis_text}\n\n"
                    f"**💡 Assessment:**\n"
                    f"The system is responsive. I'm operating in autonomous mode to assist you directly.\n\n"
                    f"**🎯 Recommendation:**\n"
                    f"{rec_text}\n\n"
                    f"**⚙️ Command:**\n"
                    f"```bash\n{cmd}\n```"
                )
                
                return {
                    "analysis": response,
                    "proposed_command": self._extract_command(response)
                }
            else:
                user_text = f"Problem Reported by User:\n{clean_description}\n\nServer Diagnostic Data:\n{server_info}\n\nRelevant Past Cases:\n{context_str}\n\nPlease analyze the situation, PRIORITIZING the user's reported problem."
                
                user_content = [{"type": "text", "text": user_text}]
                
                if image_data:
                    # Append image part
                    if not image_data.startswith("data:"):
                        image_data = f"data:image/jpeg;base64,{image_data}"
                        
                    user_content.append({
                        "type": "image_url", 
                        "image_url": {"url": image_data}
                    })
                
                messages = [SystemMessage(content=system_message)]

                # Append Chat History if available
                if history:
                    # Limit history to prevent context window overflow (last 10 messages)
                    for msg in history[-10:]:
                        role = msg.get('role')
                        content = msg.get('content')
                        if role == 'user':
                            messages.append(HumanMessage(content=str(content)))
                        elif role == 'assistant':
                            messages.append(AIMessage(content=str(content)))

                messages.append(HumanMessage(content=user_content))
                
                response_msg = self.llm.invoke(messages)
                
                return {
                    "analysis": response_msg.content,
                    "proposed_command": self._extract_command(response_msg.content)
                }

        except Exception as e:
            logger.error(f"LLM Invocation Failed: {e}")
            error_msg = str(e).lower()
            if "401" in error_msg or "authentication" in error_msg or "api key" in error_msg:
                return {
                    "analysis": "❌ **Error de Autenticación**: La clave de API proporcionada es inválida o ha expirado. Por favor verifica tu configuración en Admin > AI Configuration.",
                    "proposed_command": None
                }
            # Return a fallback response instead of crashing
            return {
                "analysis": f"❌ **Error del Sistema**: Ocurrió un error al consultar al proveedor de IA: {str(e)[:200]}...",
                "proposed_command": None
            }

ai_service = AIService()
