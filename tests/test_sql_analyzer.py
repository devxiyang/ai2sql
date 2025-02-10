import pytest
from ai2sql.core.tools.sql_analyzer import SQLAnalyzer

def test_valid_sql_analysis():
    analyzer = SQLAnalyzer()
    sql = "SELECT id, name FROM users WHERE age > 18"
    
    result = analyzer.analyze(sql)
    
    assert result['is_valid']
    assert result['parsed'] is not None
    assert result['dialect'] == 'mysql'

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