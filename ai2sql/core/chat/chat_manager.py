from typing import Dict, Any, Optional, Generator, Union
from openai import OpenAI
from ..dialects import DialectManager
from ..schema.schema_manager import SchemaManager
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatManager:
    def __init__(self, api_key: Optional[str] = None, 
                 model: str = "deepseek-reasoner", 
                 base_url: str = "https://api.deepseek.com/v1", 
                 model_config: Optional[Dict[str, Any]] = None):
        if not api_key:
            api_key = os.getenv("API_KEY")
            if not api_key:
                raise ValueError("API key must be provided either through constructor or environment variables")
            
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=model_config.get("timeout", 30) if model_config else 30
        )
        self.model = model
        self.schema_manager = SchemaManager()
        self.dialect = "hive"
        self.model_config = model_config or {"max_tokens": 2000}
        
    def set_dialect(self, dialect: str) -> None:
        """设置SQL方言"""
        dialect = dialect.lower()
        if not DialectManager.is_supported(dialect):
            raise ValueError(f"不支持的SQL方言: {dialect}")
        self.dialect = dialect
        
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        prompts = []
        
        base_prompt = """You are an AI SQL assistant that helps write and optimize SQL queries.
        You have deep knowledge of SQL and database concepts."""
        prompts.append(base_prompt)
        
        sql_guidelines = """
        When writing SQL:
        1. Follow SQL best practices for readability and performance
        2. Use appropriate indentation and formatting
        3. Add helpful comments to explain complex parts
        4. Consider query performance and optimization
        5. Validate against schema when available"""
        prompts.append(sql_guidelines)
        
        if dialect_prompt := DialectManager.get_dialect_prompt(self.dialect):
            prompts.append(f"Current SQL dialect: {self.dialect.upper()}\n{dialect_prompt}")
        
        if schema_prompt := self.schema_manager.get_schema_prompt():
            prompts.append(schema_prompt)
        
        return "\n\n".join(prompts)
        
    def generate_response(self, user_input: str, stream: bool = True) -> Union[Dict[str, Any], Generator[str, None, None]]:
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
                stream=stream,
                max_tokens=self.model_config.get("max_tokens", 2000)
            )
            
            if stream:
                def response_generator():
                    reasoning_content = []
                    content = []
                    current_type = "reasoning"
                    
                    for chunk in response:
                        if chunk.choices[0].delta.reasoning_content:
                            content = chunk.choices[0].delta.reasoning_content
                            reasoning_content.append(content)
                            if current_type == "reasoning":
                                yield "思考过程：\n" if len(reasoning_content) == 1 else content
                        else:
                            content = chunk.choices[0].delta.content
                            if content:
                                if current_type == "reasoning":
                                    yield "\n\n生成的SQL：\n"
                                    current_type = "content"
                                yield content
                    
                    # 记录完整响应
                    full_response = {
                        "reasoning": "".join(reasoning_content),
                        "content": "".join(content)
                    }
                    logger.info(f"Received complete response from API:\n{full_response}")
                
                return response_generator()
            else:
                content = response.choices[0].message.content
                reasoning = response.choices[0].message.reasoning_content
                logger.info(f"Received response from API:\n{content}\nReasoning:\n{reasoning}")
                return {
                    "content": content,
                    "reasoning": reasoning
                }
            
        except Exception as e:
            logger.error(f"Error calling API: {str(e)}")
            return {
                "error": str(e),
                "content": "抱歉，处理您的请求时出现错误。",
                "details": str(e)
            } 