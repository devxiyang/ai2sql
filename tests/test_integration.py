import pytest
from pathlib import Path
import os
from ai2sql.core.chat import ChatManager
from ai2sql.utils.config import Config

@pytest.fixture
def chat_manager():
    config = Config()
    config.load_config()
    
    manager = ChatManager(
        api_key=config.get("api", "key") or os.getenv("API_KEY"),
        model=config.get("api", "model"),
        base_url=config.get("api", "base_url"),
        model_config=config.get("model")
    )
    
    # 加载测试schema
    schema_path = Path(__file__).parent / "data" / "test_schema.yml"
    if schema_path.exists():
        manager.schema_manager.load_schema_file(str(schema_path))
    
    manager.set_dialect(config.get("sql", "dialect"))
    
    return manager

def test_simple_query(chat_manager):
    """测试简单查询生成"""
    response = chat_manager.generate_response("查询用户表的所有数据", stream=False)
    
    assert "error" not in response
    assert response["content"] is not None
    content = response["content"].lower()
    assert "select" in content
    assert "from users" in content

def test_complex_query(chat_manager):
    """测试复杂查询生成"""
    response = chat_manager.generate_response(
        "统计最近7天每天的订单数量和金额，只看状态为1的订单",
        stream=False
    )
    
    assert "error" not in response
    content = response["content"].lower()
    assert "where" in content
    assert "dt" in content
    assert "order_status" in content
    assert "group by" in content

def test_stream_response(chat_manager):
    """测试流式输出"""
    chunks = []
    for chunk in chat_manager.generate_response("查询用户表的所有数据"):
        chunks.append(chunk)
    
    full_response = "".join(chunks)
    assert "select" in full_response.lower()
    assert "from users" in full_response.lower()

def test_error_handling(chat_manager, monkeypatch):
    """测试错误处理"""
    def mock_completion(*args, **kwargs):
        raise Exception("API Error")
    
    monkeypatch.setattr(chat_manager.client.chat.completions, "create", mock_completion)
    
    response = chat_manager.generate_response("查询用户数据", stream=False)
    assert "error" in response
    assert "details" in response
    assert "API Error" in response["details"]

def test_reasoner_response(chat_manager):
    """测试思维链输出"""
    response = chat_manager.generate_response(
        "查询用户表中消费金额最高的前10名用户",
        stream=False
    )
    
    assert "reasoning" in response
    assert "content" in response
    
    # 验证思维链内容
    reasoning = response["reasoning"].lower()
    assert "分析" in reasoning or "思考" in reasoning
    assert "步骤" in reasoning
    
    # 验证SQL内容
    content = response["content"].lower()
    assert "select" in content
    assert "order by" in content
    assert "limit 10" in content 