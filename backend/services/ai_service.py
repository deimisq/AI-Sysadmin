from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_aws import ChatBedrock, BedrockEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
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
            # Ensure the token is in os.environ for boto3 to pick it up
            if settings.AWS_BEARER_TOKEN_BEDROCK:
                os.environ["AWS_BEARER_TOKEN_BEDROCK"] = settings.AWS_BEARER_TOKEN_BEDROCK
            
            self.mock_mode = False
            self.llm = ChatBedrock(
                model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
                model_kwargs={"temperature": 0},
                region_name=settings.AWS_REGION
            )
            self.embeddings = BedrockEmbeddings(
                model_id="amazon.titan-embed-text-v1",
                region_name=settings.AWS_REGION
            )
        else:
            logger.warning(f"No valid API key found for provider '{self.provider}'. Using Mock Mode.")
            self.mock_mode = True

    def get_embedding(self, text: str) -> list[float]:
        if self.mock_mode:
            return [0.0] * 768  # Gemini embeddings are 768 dimensions
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
        code_block_pattern = r'```(?:bash|sh)?\s*\n(.*?)\n```'
        code_blocks = re.findall(code_block_pattern, response, re.DOTALL)
        if code_blocks:
            # Return the first code block, stripped
            return code_blocks[0].strip()
        
        # Try to find after "Command to Execute:" or similar markers
        command_patterns = [
            r'\*\*Command to Execute\*\*:\s*`([^`]+)`',
            r'\*\*Command to Execute\*\*:\s*(.+?)(?:\n|$)',
            r'Command to Execute:\s*`([^`]+)`',
            r'Command to Execute:\s*(.+?)(?:\n|$)',
            r'Execute:\s*`([^`]+)`',
            r'Run:\s*`([^`]+)`',
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
        logger.warning("Could not extract command from AI response")
        return None

    def analyze_problem(self, db: Session, problem_description: str, server_info: str, language: str = "en") -> str:
        """
        Analyzes a problem using RAG and proposes a solution.
        Now with improved conversational analysis and problem verification.
        Supports multiple languages.
        """
        # 1. Retrieve relevant context
        similar_cases = self.search_knowledge_base(db, problem_description)
        
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
        system_message = """You are an expert Sysadmin AI Agent with deep Linux expertise. Your role is to have an INTELLIGENT CONVERSATION with the user about their server issues.

CRITICAL INSTRUCTIONS:

1. **PRIORITIZE THE USER'S REPORT**: 
   - The user's description of the problem is the MOST IMPORTANT signal.
   - If the user reports a specific error (e.g., "Database error", "No route to host"), FOCUS ON THAT, even if the diagnostic data looks normal.
   - Do NOT dismiss the user's report just because CPU/RAM usage is low.

2. **ANALYZE DATA INTELLIGENTLY (FILTER NOISE)**:
   - You will receive diagnostic data (CPU, memory, processes).
   - **WARNING**: Diagnostic commands themselves (like `top`, `ps`, `grep`, `bash`) often show up as high-CPU processes for a split second. **IGNORE THEM**. Do not report "High CPU on bash/ps" unless it's sustained.
   - Look for REAL anomalies: sustained high load, out of memory, disk full, specific error logs related to the user's report.

3. **BE CONVERSATIONAL & CONTEXT AWARE**: 
   - Don't act like a robot reading a stat sheet.
   - If the user says "Zabbix isn't working", don't just say "CPU is 0%". Ask about Zabbix logs, check ports, check database connectivity.
   - Explain your thinking process.

4. **STRUCTURE YOUR RESPONSE**:
   
   **🔍 Analysis of Current State:**
   [Briefly summarize key findings. Focus on what's RELEVANT to the user's report.]
   
   **💡 Assessment:**
   [Connect the dots. Does the data explain the user's error? If not, what might be happening?]
   
   **🎯 Recommendation:**
   [Concrete next steps. If the user reported a DB error, suggest checking DB logs or connectivity, not just "monitor CPU".]
   
   **💬 Questions/Next Steps:**
   [Clarifying questions]
   
   **⚙️ Command (if applicable):**
   [Provide diagnostic commands relevant to the SPECIFIC error reported]

5. **COMMAND GUIDELINES**:
   - Only propose a command if action is actually needed.
   - Always wrap commands in bash code blocks:
   ```bash
   your-command-here
   ```

Remember: You are a helpful senior sysadmin helping a junior admin. Listen to them first, then look at the data.""" + language_instruction

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message),
            ("user", """Problem Reported by User:
{problem}

Server Diagnostic Data:
{server_info}

Relevant Past Cases:
{context}

Please analyze the situation, PRIORITIZING the user's reported problem.""")
        ])

        # 3. Invoke LLM
        if self.mock_mode:
            # Mock response that simulates analysis of diagnostic data
            response = (
                "**🔍 Analysis of Current State:**\n"
                "Based on the diagnostic data collected:\n"
                "- CPU Usage: Currently at 4.8% user, 95.2% idle\n"
                "- Memory Usage: 1957 MB used out of 3837 MB (51%)\n"
                "- Load Average: 0.00, 0.00, 0.00 (very low)\n"
                "- Top Processes: clamd using 35% memory, but CPU usage is minimal\n\n"
                "**💡 Assessment:**\n"
                "(MOCK MODE - Configure AWS_BEARER_TOKEN_BEDROCK for real analysis)\n\n"
                "**🎯 Recommendation:**\n"
                "Set up proper AI credentials to get real analysis.\n\n"
                "**💬 Questions/Next Steps:**\n"
                "Would you like me to continue monitoring this?\n\n"
                "**⚙️ Command:**\n"
                "```bash\n"
                "echo 'Configure AI credentials for real analysis'\n"
                "```"
            )
        else:
            chain = prompt | self.llm | StrOutputParser()
            
            response = chain.invoke({
                "server_info": server_info,
                "problem": problem_description,
                "context": context_str
            })
        
        # Extract the command from the response
        extracted_command = self._extract_command(response)
        
        return {
            "analysis": response,
            "proposed_command": extracted_command
        }

ai_service = AIService()
