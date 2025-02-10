import pytest
from pathlib import Path
from ai2sql.core.schema import SchemaManager
import yaml
import os

@pytest.fixture
def schema_manager():
    return SchemaManager()

@pytest.fixture
def test_schema_dir(tmp_path):
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
    
    # 创建子目录
    sub_dir = schema_dir / "sub"
    sub_dir.mkdir()
    
    # 写入测试文件
    with open(schema_dir / "schema1.yml", "w") as f:
        yaml.dump(schema1, f)
    with open(sub_dir / "schema2.yml", "w") as f:
        yaml.dump(schema2, f)
        
    return schema_dir

def test_load_single_schema(schema_manager):
    """测试加载单个schema文件"""
    schema_path = Path(__file__).parent / "data" / "test_schema.yml"
    schema_manager.load_schema_file(schema_path)
    assert schema_manager.get_table_count() > 0
    assert "users" in schema_manager.get_all_table_names()

def test_load_schema_dir(schema_manager, test_schema_dir):
    """测试从目录加载schema"""
    schema_manager.load_schema_dir(test_schema_dir)
    assert schema_manager.get_table_count() == 2
    assert set(schema_manager.get_all_table_names()) == {"users", "orders"}
    
    # 验证表结构
    users = schema_manager.get_table_info("users")
    assert users["comment"] == "用户表"
    assert len(users["columns"]) == 2
    
    orders = schema_manager.get_table_info("orders")
    assert orders["comment"] == "订单表"
    assert len(orders["columns"]) == 2

def test_load_schema_dir_non_recursive(schema_manager, test_schema_dir):
    """测试非递归加载schema目录"""
    schema_manager.load_schema_dir(test_schema_dir, recursive=False)
    assert schema_manager.get_table_count() == 1
    assert "users" in schema_manager.get_all_table_names()
    assert "orders" not in schema_manager.get_all_table_names()

def test_clear_schemas(schema_manager, test_schema_dir):
    """测试清除schema"""
    schema_manager.load_schema_dir(test_schema_dir)
    assert schema_manager.get_table_count() > 0
    
    schema_manager.clear_schemas()
    assert schema_manager.get_table_count() == 0
    assert len(schema_manager.get_all_table_names()) == 0

def test_duplicate_table_definition(schema_manager, tmp_path):
    """测试重复表定义处理"""
    # 创建两个包含相同表的schema文件
    schema1 = {
        "tables": [{
            "name": "test",
            "comment": "版本1",
            "columns": [{"name": "id", "type": "int"}]
        }]
    }
    
    schema2 = {
        "tables": [{
            "name": "test",
            "comment": "版本2",
            "columns": [{"name": "id", "type": "int"}, {"name": "name", "type": "string"}]
        }]
    }
    
    file1 = tmp_path / "schema1.yml"
    file2 = tmp_path / "schema2.yml"
    
    with open(file1, "w") as f:
        yaml.dump(schema1, f)
    with open(file2, "w") as f:
        yaml.dump(schema2, f)
        
    schema_manager.load_schema_file(file1)
    schema_manager.load_schema_file(file2)
    
    # 验证使用了最新的定义
    test_table = schema_manager.get_table_info("test")
    assert test_table["comment"] == "版本2"
    assert len(test_table["columns"]) == 2 