import os
import pytest
from pathlib import Path
from dotenv import load_dotenv
from ai2sql.utils.config import Config
from ai2sql.core.chat import ChatManager
from typing import Optional, Dict, Any

# 加载环境变量
load_dotenv()

@pytest.fixture
def test_data_dir():
    return Path(__file__).parent / "data"

@pytest.fixture
def config():
    config = Config()
    config_path = Path(__file__).parent / "data" / "test_config.yml"
    if config_path.exists():
        config._load_yaml(str(config_path))
    return config

class MockChatManager(ChatManager):
    def generate_response(self, user_input: str, dialect: Optional[str] = None) -> Dict[str, Any]:
        """模拟响应生成"""
        if "products" in user_input.lower():
            return {
                "content": "抱歉，products表不存在。可用的表包括：users, orders",
                "tool_results": None
            }
        
        return {
            "content": f"""
            基于您的需求，以下是SQL查询：
            
            ```sql
            SELECT * FROM users
            JOIN orders ON users.user_id = orders.user_id
            WHERE dt = '2024-01-01'
            GROUP BY user_id
            ```
            
            这个查询会...
            """,
            "tool_results": None
        }

@pytest.fixture
def chat_manager(config, test_data_dir, tmp_path):
    # 使用临时目录作为SQL输出目录
    sql_output_dir = tmp_path / "sql_output"
    
    manager = ChatManager(
        api_key=os.getenv("API_KEY"),
        model=os.getenv("API_MODEL", "deepseek-chat"),
        base_url=os.getenv("API_BASE_URL", "https://api.deepseek.com/v1"),
        model_config={
            "temperature": float(os.getenv("MODEL_TEMPERATURE", "0.7")),
            "max_tokens": int(os.getenv("MODEL_MAX_TOKENS", "2000")),
            "top_p": float(os.getenv("MODEL_TOP_P", "0.9")),
            "timeout": int(os.getenv("MODEL_TIMEOUT", "30"))
        },
        sql_output_dir=str(sql_output_dir)
    )
    
    # 加载测试schema
    schema_path = test_data_dir / "test_schema.yml"
    if schema_path.exists():
        manager.schema_manager.load_schema_file(str(schema_path))
    
    return manager 