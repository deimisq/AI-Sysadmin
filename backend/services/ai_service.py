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

    def analyze_problem(self, db: Session, problem_description: str, server_info: str) -> str:
        """
        Analyzes a problem using RAG and proposes a solution.
        Now with improved conversational analysis and problem verification.
        """
        # 1. Retrieve relevant context
        similar_cases = self.search_knowledge_base(db, problem_description)
        
        context_str = ""
        for case in similar_cases:
            context_str += f"- Problem: {case.problem_description}\n  Solution: {case.solution_description}\n  Command: {case.command_executed}\n\n"
            
        if not context_str:
            context_str = "No previous similar cases found."

        # 2. Construct Enhanced Prompt for conversational analysis
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Sysadmin AI Agent with deep Linux expertise. Your role is to have an INTELLIGENT CONVERSATION with the user about their server issues.

CRITICAL INSTRUCTIONS:
1. **ANALYZE THE ACTUAL DATA**: You will receive REAL diagnostic data from the server (CPU usage, memory, processes, logs, etc.). READ IT CAREFULLY.

2. **VERIFY THE PROBLEM EXISTS**: 
   - If the diagnostic data shows the problem is NOT present (e.g., user says "high CPU" but CPU is at 5%), TELL THEM the problem doesn't currently exist
   - Explain what you see in the data and why it contradicts their concern
   - Suggest possible reasons (intermittent issue, already resolved, misunderstanding)
   - Ask if they want to monitor it or investigate further

3. **BE CONVERSATIONAL**: 
   - Don't just give commands - EXPLAIN your thinking
   - Ask clarifying questions when needed
   - Provide context and education
   - Suggest next steps for investigation

4. **STRUCTURE YOUR RESPONSE**:
   
   **🔍 Analysis of Current State:**
   [Detailed analysis of what the diagnostic data shows - be specific with numbers and facts]
   
   **💡 Assessment:**
   [Is the problem present? If not, explain why. If yes, what's the root cause?]
   
   **🎯 Recommendation:**
   [What should be done next? This could be: monitoring, further investigation, a fix, or confirmation that all is well]
   
   **💬 Questions/Next Steps:**
   [Any questions for the user or suggested follow-up actions]
   
   **⚙️ Command (if applicable):**
   [Only if a command is needed, provide it in a bash code block]

5. **COMMAND GUIDELINES**:
   - Only propose a command if action is actually needed
   - If the problem doesn't exist, DON'T propose a fix command
   - For investigation, propose diagnostic commands
   - Always wrap commands in bash code blocks:
   ```bash
   your-command-here
   ```

Remember: You're having a conversation, not just executing commands. Be helpful, thorough, and honest about what the data shows."""),
            ("user", """Server Information:
{server_info}

Problem Reported by User:
{problem}

Relevant Past Cases:
{context}

Please analyze the situation and respond conversationally.""")
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
