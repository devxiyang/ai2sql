from typing import Dict, Any, Optional, Generator, Union
from pathlib import Path
from openai import OpenAI
from ..dialects import DialectManager
from ..schema.schema_manager import SchemaManager
from ...utils.sql_writer import SQLWriter
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatManager:
    def __init__(self, api_key: Optional[str] = None, 
                 model: str = "deepseek-reasoner", 
                 base_url: str = "https://api.deepseek.com/v1", 
                 model_config: Optional[Dict[str, Any]] = None,
                 sql_output_dir: str = "generated_sql",
                 schema_dir: Optional[str] = None):
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
        self.sql_writer = SQLWriter(sql_output_dir)
        
        # 如果提供了schema目录，自动加载
        if schema_dir:
            self.load_schemas(schema_dir)
            
    def load_schemas(self, schema_dir: Union[str, Path], recursive: bool = True) -> None:
        """加载schema目录
        
        Args:
            schema_dir: schema目录路径
            recursive: 是否递归搜索子目录
        """
        self.schema_manager.load_schema_dir(schema_dir, recursive)
        
    def clear_schemas(self) -> None:
        """清除所有已加载的schema"""
        self.schema_manager.clear_schemas()
        
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
        
    def generate_response(self, user_input: str, stream: bool = True, save_sql: bool = True) -> Union[Dict[str, Any], Generator[str, None, None]]:
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
                max_tokens=self.model_config.get("max_tokens", 4000),
                temperature=self.model_config.get("temperature", 0.7),
                top_p=self.model_config.get("top_p", 0.9),
                presence_penalty=self.model_config.get("presence_penalty", 0.1),
                frequency_penalty=self.model_config.get("frequency_penalty", 0.1)
            )
            
            if stream:
                def response_generator():
                    reasoning_content = []
                    sql_content = []
                    current_type = "reasoning"
                    
                    for chunk in response:
                        if not chunk.choices:
                            continue
                            
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                            content = delta.reasoning_content
                            reasoning_content.append(content)
                            if current_type == "reasoning":
                                yield "思考过程：\n" if len(reasoning_content) == 1 else content
                        elif hasattr(delta, 'content') and delta.content:
                            content = delta.content
                            sql_content.append(content)
                            if current_type == "reasoning":
                                yield "\n\n生成的SQL：\n"
                                current_type = "content"
                            yield content
                    
                    # 保存SQL到文件
                    if save_sql and sql_content:
                        sql = "".join(sql_content)
                        if sql.strip():  # 确保SQL不为空
                            description = user_input
                            filepath = self.sql_writer.write_sql(sql, description)
                            yield f"\n\nSQL已保存到文件: {filepath}"
                    
                    # 记录完整响应
                    full_response = {
                        "reasoning": "".join(reasoning_content),
                        "content": "".join(sql_content)
                    }
                    logger.info(f"Received complete response from API:\n{full_response}")
                
                return response_generator()
            else:
                content = response.choices[0].message.content
                reasoning = getattr(response.choices[0].message, 'reasoning_content', '')
                
                # 保存SQL到文件
                if save_sql and content and content.strip():
                    filepath = self.sql_writer.write_sql(content, user_input)
                    logger.info(f"SQL saved to: {filepath}")
                
                logger.info(f"Received response from API:\n{content}\nReasoning:\n{reasoning}")
                return {
                    "content": content,
                    "reasoning": reasoning,
                    "sql_file": filepath if save_sql and content else None
                }
            
        except Exception as e:
            logger.error(f"Error calling API: {str(e)}")
            return {
                "error": str(e),
                "content": "抱歉，处理您的请求时出现错误。",
                "details": str(e)
            } 