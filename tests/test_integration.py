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
        api_key=config.get("api_key") or os.getenv("API_KEY"),
        model=config.get("model"),
        base_url=config.get("base_url")
    )
    
    # 加载测试schema
    schema_path = Path(__file__).parent / "data" / "test_schema.yml"
    if schema_path.exists():
        manager.schema_manager.load_schema_file(str(schema_path))
    
    # 设置方言
    manager.set_dialect("hive")
    
    return manager

def test_simple_query(chat_manager):
    """测试简单查询生成"""
    response = chat_manager.generate_response("查询用户表的所有数据")
    
    assert "error" not in response
    assert response["content"] is not None
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

def test_with_schema_reference(chat_manager):
    """测试引用schema中的列信息"""
    response = chat_manager.generate_response(
        "查询订单金额大于1000且用户状态为1的用户名和订单信息"
    )
    
    content = response["content"].lower()
    assert "order_amount > 1000" in content
    assert "status = 1" in content
    assert "username" in content
    assert "join" in content

def test_with_partition(chat_manager):
    """测试分区查询"""
    response = chat_manager.generate_response(
        "查询2024年1月份每个用户的订单总金额"
    )
    
    content = response["content"].lower()
    assert "dt" in content
    assert "2024-01" in content
    assert "sum" in content
    assert "group by" in content

def test_complex_aggregation(chat_manager):
    """测试复杂聚合查询"""
    response = chat_manager.generate_response(
        "统计每个用户的订单数量、平均订单金额、最大订单金额和最近一笔订单时间"
    )
    
    content = response["content"].lower()
    assert "count" in content
    assert "avg" in content
    assert "max" in content
    assert "created_at" in content
    assert "group by" in content

def test_subquery(chat_manager):
    """测试子查询"""
    response = chat_manager.generate_response(
        "查询下过订单的用户中，订单总金额最高的前10名用户信息"
    )
    
    content = response["content"].lower()
    assert "select" in content
    assert "sum" in content
    assert "order by" in content
    assert "limit 10" in content

def test_window_function(chat_manager):
    """测试窗口函数"""
    response = chat_manager.generate_response(
        "计算每个用户的订单金额占总订单金额的百分比"
    )
    
    content = response["content"].lower()
    assert "sum" in content
    assert "over" in content
    assert "partition by" in content

def test_complex_conditions(chat_manager):
    """测试复杂条件组合"""
    response = chat_manager.generate_response(
        "查询最近30天内，每天下单次数超过3次且单笔订单金额都大于1000的用户"
    )
    
    content = response["content"].lower()
    assert "having" in content
    assert "count" in content
    assert "> 3" in content
    assert "order_amount > 1000" in content
    assert "dt" in content

def test_dialect_specific_features(chat_manager):
    """测试Hive特定功能"""
    response = chat_manager.generate_response(
        "统计每个分区下的订单数量和总金额"
    )
    
    content = response["content"].lower()
    assert "dt" in content
    assert "group by dt" in content
    assert "sum" in content
    assert "count" in content

def test_schema_constraints(chat_manager):
    """测试schema约束处理"""
    response = chat_manager.generate_response(
        "查询所有必填字段的值"
    )
    
    content = response["content"].lower()
    assert "user_id" in content  # user_id 是非空字段
    assert "order_id" in content  # order_id 是非空字段 