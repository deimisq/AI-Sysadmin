from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy.orm import Session
from sqlalchemy import text
from settings import settings
import models
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # In a real scenario, we'd handle missing keys gracefully or fallback to local models
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not set. Using Mock Mode.")
            self.mock_mode = True
        else:
            self.mock_mode = False
            self.llm = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY, 
                model="gpt-4o", 
                temperature=0
            )
            self.embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)

    def get_embedding(self, text: str) -> list[float]:
        if self.mock_mode:
            return [0.0] * 1536
        return self.embeddings.embed_query(text)

    def search_knowledge_base(self, db: Session, query: str, limit: int = 3):
        """
        Search for similar problems in the knowledge base using vector similarity.
        """
        query_embedding = self.get_embedding(query)
        
        # PGVector search using L2 distance (<-> operator) or Cosine distance (<=> operator)
        # We use cosine distance here (<=>)
        results = db.query(models.KnowledgeBase).order_by(
            models.KnowledgeBase.embedding.cosine_distance(query_embedding)
        ).limit(limit).all()
        
        return results

    def analyze_problem(self, db: Session, problem_description: str, server_info: str) -> str:
        """
        Analyzes a problem using RAG and proposes a solution.
        """
        # 1. Retrieve relevant context
        similar_cases = self.search_knowledge_base(db, problem_description)
        
        context_str = ""
        for case in similar_cases:
            context_str += f"- Problem: {case.problem_description}\n  Solution: {case.solution_description}\n  Command: {case.command_executed}\n\n"
            
        if not context_str:
            context_str = "No previous similar cases found."

        # 2. Construct Prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert Sysadmin AI Agent. Your goal is to diagnose server issues based on REAL diagnostic data collected from the server. \n"
                       "You will receive actual system metrics (CPU, memory, disk, processes, logs, etc.). \n"
                       "Analyze this data carefully before proposing solutions. \n"
                       "Your response should include:\n"
                       "1. **Analysis**: What you found in the diagnostic data\n"
                       "2. **Root Cause**: What is causing the issue based on evidence\n"
                       "3. **Proposed Solution**: Recommended action\n"
                       "4. **Command to Execute**: Specific command (if applicable)\n"
                       "Be thorough and base your recommendations on the actual data provided."),
            ("user", "Server Info: {server_info}\n\nProblem Description: {problem}\n\nRelevant Past Cases:\n{context}")
        ])

        # 3. Invoke LLM
        if self.mock_mode:
            # Mock response that simulates analysis of diagnostic data
            response = (
                "**Analysis**: Based on the diagnostic data collected:\n"
                "- CPU Usage: Analyzed current CPU consumption\n"
                "- Memory Usage: Checked available memory\n"
                "- Top Processes: Identified resource-intensive processes\n"
                "- System Logs: Reviewed recent errors\n\n"
                "**Root Cause**: (MOCK MODE - Real analysis would be based on actual diagnostic data)\n\n"
                "**Proposed Solution**: After analyzing the system metrics, recommend appropriate action.\n\n"
                "**Command to Execute**: Specific command based on findings"
            )
        else:
            chain = prompt | self.llm | StrOutputParser()
            
            response = chain.invoke({
                "server_info": server_info,
                "problem": problem_description,
                "context": context_str
            })
        
        # Try to parse as JSON or ensure it's structured
        # For MVP, we'll trust the LLM follows instructions or wrap it
        return {
            "analysis": response,
            "proposed_command": "Extract command from response if possible or use specific field" 
        }

ai_service = AIService()
