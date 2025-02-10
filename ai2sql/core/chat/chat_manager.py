from typing import List, Dict, Any, Optional
from openai import OpenAI
from ..dialects import DialectManager
from ..schema.schema_manager import SchemaManager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatManager:
    def __init__(self, api_key: str, model: str = "deepseek-chat", base_url: str = "https://api.deepseek.com/v1"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = model
        self.schema_manager = SchemaManager()
        self.dialect = "hive"  # 默认方言
        
    def set_dialect(self, dialect: str) -> None:
        """设置SQL方言"""
        dialect = dialect.lower()
        if not DialectManager.is_supported(dialect):
            raise ValueError(f"不支持的SQL方言: {dialect}")
        self.dialect = dialect
        
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        prompts = []
        
        # 基础SQL助手提示
        base_prompt = """You are an AI SQL assistant that helps users write and optimize SQL queries.
        You have deep knowledge of SQL and database concepts."""
        prompts.append(base_prompt)
        
        # SQL编写指南
        sql_guidelines = """
        When writing SQL:
        1. Follow SQL best practices for readability and performance
        2. Use appropriate indentation and formatting
        3. Add helpful comments to explain complex parts
        4. Consider query performance and optimization
        5. Validate against schema when available"""
        prompts.append(sql_guidelines)
        
        # 方言特定提示
        dialect_prompt = DialectManager.get_dialect_prompt(self.dialect)
        if dialect_prompt:
            prompts.append(f"Current SQL dialect: {self.dialect.upper()}\n{dialect_prompt}")
        
        # Schema信息
        schema_prompt = self.schema_manager.get_schema_prompt()
        if schema_prompt:
            prompts.append(schema_prompt)
        
        return "\n\n".join(prompts)
        
    def generate_response(self, user_input: str) -> Dict[str, Any]:
        """生成AI响应"""
        messages = [
            {"role": "system", "content": self.get_system_prompt()},
            {"role": "user", "content": user_input}
        ]
        
        try:
            logger.info(f"Sending request to API with prompt:\n{messages[-1]}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False,
                temperature=0.7,
                max_tokens=2000
            )
            
            logger.info(f"Received response from API:\n{response.choices[0].message.content}")
            
            return {
                "content": response.choices[0].message.content,
            }
            
        except Exception as e:
            logger.error(f"Error calling API: {str(e)}")
            return {
                "error": str(e),
                "content": "抱歉，处理您的请求时出现错误。",
                "details": str(e)
            } 