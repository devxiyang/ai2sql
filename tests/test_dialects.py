import pytest
from ai2sql.core.dialects import DialectManager, SQLDialect

def test_supported_dialects():
    """测试支持的方言列表"""
    dialects = DialectManager.get_supported_dialects()
    assert "hive" in dialects
    assert "postgres" in dialects
    assert "mysql" in dialects
    
def test_dialect_validation():
    """测试方言验证"""
    assert DialectManager.is_supported("hive")
    assert not DialectManager.is_supported("invalid_dialect")
    
def test_dialect_prompts():
    """测试方言提示"""
    hive_prompt = DialectManager.get_dialect_prompt("hive")
    assert hive_prompt is not None
    assert "partitioning" in hive_prompt.lower()
    
    invalid_prompt = DialectManager.get_dialect_prompt("invalid_dialect")
    assert invalid_prompt is None 