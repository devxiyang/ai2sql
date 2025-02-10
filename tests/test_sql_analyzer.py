import pytest
from ai2sql.core.tools.sql_analyzer import SQLAnalyzer

def test_valid_sql_analysis():
    analyzer = SQLAnalyzer()
    sql = "SELECT id, name FROM users WHERE age > 18"
    
    result = analyzer.analyze(sql)
    
    assert result['is_valid']
    assert result['parsed'] is not None
    assert result['formatted'] is not None
    assert result['dialect'] == 'mysql'
    assert result['tokens'] is not None
    assert result['type'] == 'SELECT'

def test_invalid_sql_analysis():
    analyzer = SQLAnalyzer()
    sql = "SELECT * FROM"  # 无效的SQL
    
    result = analyzer.analyze(sql)
    
    assert not result['is_valid']
    assert result['error'] is not None

def test_sql_formatting():
    analyzer = SQLAnalyzer()
    sql = "SELECT id,name FROM users WHERE age>18"
    
    formatted = analyzer.format_sql(sql)
    
    assert 'SELECT' in formatted
    assert 'FROM' in formatted
    assert 'WHERE' in formatted
    assert '\n' in formatted

def test_format_error_handling():
    analyzer = SQLAnalyzer()
    
    with pytest.raises(ValueError):
        analyzer.format_sql("NOT A SQL QUERY") 

def test_analyze_syntax():
    analyzer = SQLAnalyzer()
    result = analyzer.analyze_syntax("SELECT * FROM users")
    assert isinstance(result, dict)
    # TODO: 添加更多具体的断言

def test_analyze_performance():
    analyzer = SQLAnalyzer()
    result = analyzer.analyze_performance("SELECT * FROM users WHERE id > 1000")
    assert isinstance(result, dict)
    # TODO: 添加更多具体的断言

def test_analyze_security():
    analyzer = SQLAnalyzer()
    result = analyzer.analyze_security("SELECT * FROM users WHERE password = 'input'")
    assert isinstance(result, dict)
    # TODO: 添加更多具体的断言

def test_suggest_optimizations():
    analyzer = SQLAnalyzer()
    suggestions = analyzer.suggest_optimizations("SELECT * FROM users")
    assert isinstance(suggestions, list)
    # TODO: 添加更多具体的断言 

def test_analyze_hive_specific():
    analyzer = SQLAnalyzer()
    sql = """
    SELECT a.user_id, b.order_id
    FROM users a
    JOIN orders b ON a.user_id = b.user_id
    WHERE a.dt = '2024-01-01'
    DISTRIBUTE BY user_id
    """
    
    result = analyzer.analyze_hive_specific(sql)
    assert isinstance(result, dict)
    assert "partitioning" in result
    assert "optimization" in result
    
def test_suggest_hive_optimizations():
    analyzer = SQLAnalyzer()
    sql = "SELECT * FROM users"
    
    suggestions = analyzer.suggest_hive_optimizations(sql)
    assert isinstance(suggestions, list)
    assert len(suggestions) > 0 