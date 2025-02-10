import pytest
from pathlib import Path
import os
from ai2sql.core.chat import ChatManager
from ai2sql.utils.config import Config
import shutil
import yaml

@pytest.fixture
def schema_dir(tmp_path):
    # 创建测试schema目录
    schema_dir = tmp_path / "schemas"
    schema_dir.mkdir()
    
    # 创建测试schema文件
    schema1 = {
        "tables": [
            {
                "name": "users",
                "comment": "用户表",
                "columns": [
                    {"name": "id", "type": "int", "nullable": False},
                    {"name": "name", "type": "string", "comment": "用户名"}
                ]
            }
        ]
    }
    
    schema2 = {
        "tables": [
            {
                "name": "orders",
                "comment": "订单表",
                "columns": [
                    {"name": "id", "type": "int", "nullable": False},
                    {"name": "user_id", "type": "int", "comment": "用户ID"}
                ]
            }
        ]
    }
    
    # 写入测试文件
    with open(schema_dir / "schema1.yml", "w") as f:
        yaml.dump(schema1, f)
    with open(schema_dir / "schema2.yml", "w") as f:
        yaml.dump(schema2, f)
        
    return schema_dir

@pytest.fixture
def chat_manager(tmp_path, schema_dir):
    config = Config()
    config.load_config()
    
    # 使用临时目录作为SQL输出目录
    sql_output_dir = tmp_path / "sql_output"
    
    manager = ChatManager(
        api_key=config.get("api", "key") or os.getenv("API_KEY"),
        model=config.get("api", "model"),
        base_url=config.get("api", "base_url"),
        model_config=config.get("model"),
        sql_output_dir=str(sql_output_dir),
        schema_dir=str(schema_dir)  # 自动加载schema目录
    )
    
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

def test_sql_file_saving(chat_manager):
    """测试SQL文件保存功能"""
    query = "查询用户表的所有数据"
    response = chat_manager.generate_response(query, stream=False, save_sql=True)
    
    assert "error" not in response
    assert response["sql_file"] is not None
    assert os.path.exists(response["sql_file"])
    
    # 检查文件内容
    with open(response["sql_file"], 'r', encoding='utf-8') as f:
        content = f.read()
        assert "Description: " + query in content
        assert "Generated at: " in content
        assert "SELECT" in content.upper()
        assert "FROM USERS" in content.upper()

def test_sql_file_saving_disabled(chat_manager):
    """测试禁用SQL文件保存功能"""
    response = chat_manager.generate_response(
        "查询用户表的所有数据",
        stream=False,
        save_sql=False
    )
    
    assert "error" not in response
    assert "sql_file" not in response or response["sql_file"] is None

def test_schema_loading(chat_manager):
    """测试schema加载"""
    # 验证表是否正确加载
    tables = chat_manager.schema_manager.get_all_table_names()
    assert "users" in tables
    assert "orders" in tables
    
    # 验证表结构
    users = chat_manager.schema_manager.get_table_info("users")
    assert users["comment"] == "用户表"
    assert len(users["columns"]) == 2
    
    # 测试生成的SQL是否使用了正确的schema
    response = chat_manager.generate_response(
        "查询用户表的id和name",
        stream=False
    )
    
    content = response["content"].lower()
    assert "select" in content
    assert "id" in content
    assert "name" in content
    assert "from users" in content

def test_complex_business_scenario(chat_manager, schema_dir):
    """
    完整的业务场景集成测试
    测试场景：电商订单分析
    - 加载多个相关表的schema
    - 生成复杂的分析SQL
    - 验证SQL的正确性
    - 确保SQL被正确保存
    """
    # 1. 准备新的schema - 添加订单明细和商品表
    order_details_schema = {
        "tables": [{
            "name": "order_details",
            "comment": "订单明细表",
            "columns": [
                {"name": "id", "type": "int", "nullable": False},
                {"name": "order_id", "type": "int", "comment": "订单ID", "nullable": False},
                {"name": "product_id", "type": "int", "comment": "商品ID", "nullable": False},
                {"name": "quantity", "type": "int", "comment": "购买数量"},
                {"name": "price", "type": "decimal(10,2)", "comment": "商品单价"},
                {"name": "total_amount", "type": "decimal(10,2)", "comment": "总金额"}
            ]
        }]
    }
    
    products_schema = {
        "tables": [{
            "name": "products",
            "comment": "商品表",
            "columns": [
                {"name": "id", "type": "int", "nullable": False},
                {"name": "name", "type": "string", "comment": "商品名称"},
                {"name": "category", "type": "string", "comment": "商品类别"},
                {"name": "price", "type": "decimal(10,2)", "comment": "标准售价"}
            ]
        }]
    }
    
    # 2. 添加新的schema文件
    with open(schema_dir / "order_details.yml", "w") as f:
        yaml.dump(order_details_schema, f)
    with open(schema_dir / "products.yml", "w") as f:
        yaml.dump(products_schema, f)
    
    # 3. 重新加载schema
    chat_manager.clear_schemas()
    chat_manager.load_schemas(schema_dir)
    
    # 4. 验证schema加载
    tables = chat_manager.schema_manager.get_all_table_names()
    assert set(tables) == {"users", "orders", "order_details", "products"}
    
    # 5. 生成复杂的分析SQL
    query = """
    分析2024年第一季度的销售情况：
    1. 按商品类别统计销售额和销售量
    2. 找出销售额前10的商品，包含商品名称和销售详情
    3. 计算每个用户的消费总额，并标记出高价值用户（消费总额>10000）
    4. 只统计已完成的订单（状态为1）
    """
    
    response = chat_manager.generate_response(query, stream=False, save_sql=True)
    
    # 6. 验证响应
    assert "error" not in response
    assert response["content"] is not None
    assert response["reasoning"] is not None
    assert response["sql_file"] is not None
    
    # 7. 验证SQL内容
    sql_content = response["content"].lower()
    
    # 验证表连接
    assert "join" in sql_content
    assert "order_details" in sql_content
    assert "products" in sql_content
    assert "users" in sql_content
    
    # 验证时间条件
    assert "2024" in sql_content
    assert ("q1" in sql_content or "第一季度" in sql_content or 
            ("between" in sql_content and "2024-01-01" in sql_content))
    
    # 验证分组和聚合
    assert "group by" in sql_content
    assert "sum" in sql_content
    assert "category" in sql_content
    
    # 验证TOP N分析
    assert "top" in sql_content.lower() or "limit 10" in sql_content
    assert "order by" in sql_content
    
    # 验证条件过滤
    assert "status = 1" in sql_content or "status = '1'" in sql_content
    assert ">= 10000" in sql_content or "> 10000" in sql_content
    
    # 8. 验证SQL文件
    assert os.path.exists(response["sql_file"])
    with open(response["sql_file"], 'r', encoding='utf-8') as f:
        file_content = f.read()
        assert "Description:" in file_content
        assert "Generated at:" in file_content
        assert query.strip() in file_content
        
    # 9. 验证思维链输出
    reasoning = response["reasoning"].lower()
    assert "分析" in reasoning
    assert "步骤" in reasoning
    assert any(keyword in reasoning for keyword in ["销售额", "商品", "用户", "订单"]) 