from typing import List, Dict, Any, Optional
import json
from openai import OpenAI
from ..tools.tool_registry import ToolRegistry
from ..dialects import DialectManager, SQLDialect
from ..schema.schema_manager import SchemaManager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatManager:
    def __init__(self, api_key: str, model: str = "deepseek-chat", base_url: str = "https://api.deepseek.com"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = model
        self.tool_registry = ToolRegistry()
        self.conversation_history: List[Dict[str, str]] = []
        self.schema_manager = SchemaManager()
        self.dialect = "hive"  # 默认方言
        
    def set_dialect(self, dialect: str) -> None:
        """设置SQL方言"""
        dialect = dialect.lower()
        if not DialectManager.is_supported(dialect):
            raise ValueError(f"不支持的SQL方言: {dialect}")
        self.dialect = dialect
        
    def add_message(self, role: str, content: str) -> None:
        """添加消息到对话历史"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })
        
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
        
        # 解释指南
        explanation_guidelines = """
        When explaining:
        1. Break down complex concepts into simple terms
        2. Provide examples when helpful
        3. Explain your reasoning and recommendations
        4. Point out potential performance implications
        5. Suggest relevant optimizations
        
        Always aim to be helpful, clear, and precise in your responses."""
        prompts.append(explanation_guidelines)
        
        return "\n\n".join(prompts)
        
    def generate_response(self, user_input: str, dialect: Optional[str] = None) -> Dict[str, Any]:
        """生成AI响应"""
        if dialect:
            self.set_dialect(dialect)
            
        messages = [
            {"role": "system", "content": self.get_system_prompt()},
            *self.conversation_history,
            {"role": "user", "content": user_input}
        ]
        
        try:
            logger.info(f"Sending request to DeepSeek API with prompt:\n{messages[-1]}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False,
                temperature=0.7,
                max_tokens=2000
            )
            
            logger.info(f"Received response from DeepSeek API:\n{response.choices[0].message.content}")
            
            result = {
                "content": response.choices[0].message.content,
                "tool_results": None
            }
            
            self.add_message("assistant", result["content"])
            return result
            
        except Exception as e:
            logger.error(f"Error calling DeepSeek API: {str(e)}")
            return {
                "error": str(e),
                "content": "抱歉，处理您的请求时出现错误。",
                "details": str(e)
            }
            
    def _get_available_tools(self) -> List[Dict[str, Any]]:
        """获取可用的工具定义"""
        tools = []
        for name, tool in self.tool_registry.list_tools().items():
            tool_def = {
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool["description"],
                    "parameters": tool.get("parameters", {
                        "type": "object",
                        "properties": {},
                        "required": []
                    })
                }
            }
            tools.append(tool_def)
        return tools
        
    def _process_response(self, response: Any) -> Dict[str, Any]:
        """处理AI响应"""
        message = response.choices[0].message
        
        # 处理工具调用
        if message.tool_calls:
            results = []
            for tool_call in message.tool_calls:
                try:
                    tool = self.tool_registry.get_tool(tool_call.function.name)
                    if tool:
                        # 解析参数
                        args = json.loads(tool_call.function.arguments)
                        # 执行工具调用
                        result = tool["function"](**args)
                        results.append({
                            "tool": tool_call.function.name,
                            "result": result
                        })
                except Exception as e:
                    results.append({
                        "tool": tool_call.function.name,
                        "error": str(e)
                    })
            
            return {
                "content": message.content,
                "tool_results": results
            }
        
        return {
            "content": message.content,
            "tool_results": None
        }

    def add_to_history(self, message: Dict[str, str]):
        """
        Add message to conversation history
        """
        self.conversation_history.append(message)
        if len(self.conversation_history) > 1000:
            self.conversation_history.pop(0) 