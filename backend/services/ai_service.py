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
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY, 
            model="gpt-4o", 
            temperature=0
        )
        self.embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)

    def get_embedding(self, text: str) -> list[float]:
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
            ("system", "You are an expert Sysadmin AI Agent. Your goal is to diagnose server issues and propose concrete solutions (commands). "
                       "You have access to a history of past solved problems. Use them to guide your answer if relevant. "
                       "Always propose a specific command to run if possible. "
                       "Format your response clearly with a 'Analysis', 'Proposed Solution', and 'Command to Execute' section."),
            ("user", "Server Info: {server_info}\n\nProblem Description: {problem}\n\nRelevant Past Cases:\n{context}")
        ])

        # 3. Invoke LLM
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
