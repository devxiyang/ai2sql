import pytest
from pathlib import Path
from ai2sql.core.chat import ChatManager
from ai2sql.utils.config import Config

@pytest.fixture
def chat_manager():
    config = Config()
    config.load_config()
    
    manager = ChatManager(
        api_key=config.get("openai_api_key", "test-key"),
        model="deepseek-r1",
        dialect="hive"
    )
    
    # 加载测试schema
    schema_path = Path(__file__).parent / "data" / "test_schema.yml"
    manager.schema_manager.load_schema_file(schema_path)
    
    return manager

def test_simple_query(chat_manager):
    """测试简单查询生成"""
    response = chat_manager.generate_response("查询用户表的所有数据")
    
    assert "error" not in response
    assert response["content"] is not None
    # 检查响应中是否包含SQL相关内容
    content = response["content"].lower()
    assert "select" in content
    assert "from users" in content

def test_join_query(chat_manager):
    """测试JOIN查询生成"""
    response = chat_manager.generate_response(
        "查询每个用户的订单总金额"
    )
    
    assert "error" not in response
    assert response["content"] is not None
    content = response["content"].lower()
    assert "join" in content
    assert "sum" in content
    assert "group by" in content

def test_complex_query(chat_manager):
    """测试复杂查询生成"""
    response = chat_manager.generate_response(
        "统计最近7天每天的订单数量和金额，只看状态为1的订单"
    )
    
    assert "error" not in response
    assert response["content"] is not None
    content = response["content"].lower()
    assert "where" in content
    assert "dt" in content
    assert "order_status" in content
    assert "group by" in content

def test_dialect_specific(chat_manager):
    """测试方言特定功能"""
    response = chat_manager.generate_response(
        "查询2024年1月1日的订单数据"
    )
    
    assert "error" not in response
    content = response["content"].lower()
    assert "dt" in content
    assert "2024-01-01" in content

def test_schema_validation(chat_manager):
    """测试schema验证"""
    response = chat_manager.generate_response(
        "查询products表的数据"
    )
    
    assert "error" not in response
    content = response["content"].lower()
    assert "products" not in chat_manager.schema_manager.tables
    assert any(phrase in content for phrase in [
        "table does not exist",
        "找不到表",
        "表不存在"
    ])

def test_error_handling(chat_manager, monkeypatch):
    """测试错误处理"""
    def mock_completion(*args, **kwargs):
        raise Exception("API Error")
    
    # 模拟API错误
    monkeypatch.setattr(chat_manager.client.chat.completions, "create", mock_completion)
    
    response = chat_manager.generate_response("查询用户数据")
    assert "error" in response
    assert "details" in response
    assert "API Error" in response["details"] 